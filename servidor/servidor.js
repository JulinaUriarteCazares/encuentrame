// Encuéntrame · servidor puente en tiempo real
// ------------------------------------------------------------
// Conecta la app del móvil (Encuéntrame) con la app del reloj (Encuéntrame Reloj).
// - Vinculación con código de 6 dígitos (el reloj lo muestra, el móvil lo escribe o escanea).
// - Reenvía ubicaciones, comandos (sonar, mensajes, zona) y SOS solo entre dispositivos vinculados.
// - Guarda los vínculos en datos.json; las ubicaciones solo viven en memoria.

import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { WebSocketServer } from 'ws';

const PUERTO = Number(process.env.PUERTO ?? 4000);
const ARCHIVO = process.env.ENCUENTRAME_DATOS ?? new URL('./datos.json', import.meta.url);
const VIGENCIA_CODIGO_MS = 10 * 60 * 1000;

// ---------- Estado persistente ----------
/** @type {{ dispositivos: Record<string, {id:string, rol:'movil'|'reloj', nombre:string, emoji?:string, color?:string}>, vinculos: {movil:string, reloj:string, creado:string}[] }} */
let datos = { dispositivos: {}, vinculos: [] };
try {
  datos = JSON.parse(readFileSync(ARCHIVO, 'utf8'));
} catch {
  // primera vez: no hay archivo
}
const guardar = () => writeFileSync(ARCHIVO, JSON.stringify(datos, null, 2));

// ---------- Estado en memoria ----------
/** @type {Map<string, import('ws').WebSocket>} */
const conexiones = new Map();
/** @type {Map<string, object>} última ubicación conocida de cada dispositivo */
const ubicaciones = new Map();
/** @type {Map<string, {reloj:string, expira:number}>} */
const codigos = new Map();

const log = (...a) => console.log(new Date().toLocaleTimeString(), ...a);

function pares(id) {
  return datos.vinculos.flatMap((v) => (v.movil === id ? [v.reloj] : v.reloj === id ? [v.movil] : []));
}
const estanVinculados = (a, b) => pares(a).includes(b);

function perfilPublico(id) {
  const d = datos.dispositivos[id];
  if (!d) return null;
  return { ...d, enLinea: conexiones.has(id), ubicacion: ubicaciones.get(id) ?? null };
}

function enviar(id, mensaje) {
  const ws = conexiones.get(id);
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(mensaje));
}
function enviarAPares(id, mensaje) {
  for (const p of pares(id)) enviar(p, mensaje);
}

function nuevoCodigo(reloj) {
  // Un reloj solo tiene un código vigente a la vez.
  for (const [c, v] of codigos) if (v.reloj === reloj) codigos.delete(c);
  let codigo;
  do codigo = String(Math.floor(100000 + Math.random() * 900000));
  while (codigos.has(codigo));
  const expira = Date.now() + VIGENCIA_CODIGO_MS;
  codigos.set(codigo, { reloj, expira });
  return { codigo, expira };
}

// ---------- Manejo de mensajes ----------
function manejar(ws, m) {
  const id = ws.idDispositivo;

  if (m.t === 'hola') {
    if (typeof m.id !== 'string' || !['movil', 'reloj'].includes(m.rol)) return;
    const anterior = conexiones.get(m.id);
    if (anterior && anterior !== ws) anterior.close(4000, 'Sesión abierta en otro lugar');
    ws.idDispositivo = m.id;
    conexiones.set(m.id, ws);
    const previo = datos.dispositivos[m.id];
    datos.dispositivos[m.id] = {
      ...previo,
      id: m.id,
      rol: m.rol,
      nombre: previo?.nombre ?? (typeof m.nombre === 'string' && m.nombre.trim() ? m.nombre.trim() : m.rol === 'movil' ? 'Mi móvil' : 'Reloj'),
    };
    // El móvil decide su propio nombre; el nombre del reloj lo pone quien lo vincula.
    if (m.rol === 'movil' && typeof m.nombre === 'string' && m.nombre.trim()) datos.dispositivos[m.id].nombre = m.nombre.trim();
    guardar();
    enviar(m.id, { t: 'bienvenida', yo: datos.dispositivos[m.id], pares: pares(m.id).map(perfilPublico).filter(Boolean) });
    enviarAPares(m.id, { t: 'presencia', id: m.id, enLinea: true });
    log(`➕ ${m.rol} ${datos.dispositivos[m.id].nombre} (${m.id.slice(0, 6)}) conectado`);
    return;
  }

  if (!id) return; // todo lo demás requiere haberse presentado

  switch (m.t) {
    case 'pedirCodigo': {
      if (datos.dispositivos[id]?.rol !== 'reloj') return;
      enviar(id, { t: 'codigo', ...nuevoCodigo(id) });
      return;
    }

    case 'vincular': {
      if (datos.dispositivos[id]?.rol !== 'movil') return;
      const c = codigos.get(String(m.codigo ?? '').trim());
      if (!c || c.expira < Date.now()) {
        enviar(id, { t: 'error', contexto: 'vincular', mensaje: 'Código inválido o vencido. Revisa el que muestra el reloj.' });
        return;
      }
      codigos.delete(String(m.codigo).trim());
      const reloj = datos.dispositivos[c.reloj];
      Object.assign(reloj, {
        nombre: String(m.nombre ?? '').trim() || reloj.nombre,
        emoji: m.emoji ?? reloj.emoji ?? '⌚',
        color: m.color ?? reloj.color ?? '#4FD1FF',
      });
      if (!estanVinculados(id, c.reloj)) datos.vinculos.push({ movil: id, reloj: c.reloj, creado: new Date().toISOString() });
      guardar();
      enviar(id, { t: 'vinculado', par: perfilPublico(c.reloj) });
      enviar(c.reloj, { t: 'vinculado', par: perfilPublico(id), yo: reloj });
      log(`🔗 ${datos.dispositivos[id].nombre} vinculó a ${reloj.nombre}`);
      return;
    }

    case 'perfil': {
      // Un móvil puede editar el perfil de un reloj vinculado; cualquiera puede editar el suyo.
      const objetivo = m.para && estanVinculados(id, m.para) ? m.para : id;
      const d = datos.dispositivos[objetivo];
      if (!d) return;
      for (const k of ['nombre', 'emoji', 'color']) if (typeof m[k] === 'string' && m[k].trim()) d[k] = m[k].trim();
      guardar();
      const aviso = { t: 'perfil', perfil: d };
      enviar(objetivo, aviso);
      enviarAPares(objetivo, aviso);
      return;
    }

    case 'ubicacion': {
      if (typeof m.lat !== 'number' || typeof m.lon !== 'number') return;
      const u = {
        lat: m.lat,
        lon: m.lon,
        precision: typeof m.precision === 'number' ? m.precision : null,
        rumbo: typeof m.rumbo === 'number' ? m.rumbo : null,
        bateria: typeof m.bateria === 'number' ? m.bateria : null,
        ts: Date.now(),
      };
      ubicaciones.set(id, u);
      enviarAPares(id, { t: 'ubicacion', de: id, ...u });
      return;
    }

    case 'comando': {
      if (!estanVinculados(id, m.para)) return;
      enviar(m.para, { t: 'comando', de: id, accion: m.accion, datos: m.datos ?? null, ts: Date.now() });
      return;
    }

    case 'sos': {
      enviarAPares(id, { t: 'sos', de: id, ts: Date.now(), ubicacion: ubicaciones.get(id) ?? null });
      log(`🆘 SOS de ${datos.dispositivos[id]?.nombre}`);
      return;
    }

    case 'desvincular': {
      const otro = m.con;
      const antes = datos.vinculos.length;
      datos.vinculos = datos.vinculos.filter((v) => !((v.movil === id && v.reloj === otro) || (v.reloj === id && v.movil === otro)));
      if (datos.vinculos.length !== antes) {
        guardar();
        enviar(id, { t: 'desvinculado', con: otro });
        enviar(otro, { t: 'desvinculado', con: id });
      }
      return;
    }

    case 'ping':
      enviar(id, { t: 'pong' });
      return;
  }
}

// ---------- Servidor HTTP + WebSocket ----------
const http = createServer((req, res) => {
  // Endpoint de salud: lo usa la app para "Probar conexión".
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' });
  res.end(
    JSON.stringify({
      app: 'encuentrame-servidor',
      ok: true,
      dispositivos: Object.keys(datos.dispositivos).length,
      vinculos: datos.vinculos.length,
      conectados: conexiones.size,
    }),
  );
});

const wss = new WebSocketServer({ server: http });

wss.on('connection', (ws) => {
  ws.vivo = true;
  ws.on('pong', () => (ws.vivo = true));
  ws.on('message', (crudo) => {
    let m;
    try {
      m = JSON.parse(String(crudo));
    } catch {
      return;
    }
    try {
      manejar(ws, m);
    } catch (e) {
      log('⚠️ error manejando mensaje', e);
    }
  });
  ws.on('close', () => {
    const id = ws.idDispositivo;
    if (id && conexiones.get(id) === ws) {
      conexiones.delete(id);
      enviarAPares(id, { t: 'presencia', id, enLinea: false });
      log(`➖ ${datos.dispositivos[id]?.nombre ?? id} desconectado`);
    }
  });
});

// Detecta conexiones muertas (teléfono sin señal, pestaña cerrada…)
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.vivo) {
      ws.terminate();
      continue;
    }
    ws.vivo = false;
    ws.ping();
  }
  for (const [c, v] of codigos) if (v.expira < Date.now()) codigos.delete(c);
}, 15000);

http.listen(PUERTO, '0.0.0.0', () => {
  const ips = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  console.log('\n  📍 Encuéntrame · servidor listo\n');
  console.log(`  En esta PC:      ws://localhost:${PUERTO}`);
  for (const ip of ips) console.log(`  En tu red Wi‑Fi: ws://${ip}:${PUERTO}`);
  console.log('\n  Las apps detectan esta dirección solas. Si Windows pregunta, permite el acceso en redes privadas.\n');
});
