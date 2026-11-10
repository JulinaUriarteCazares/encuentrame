// Prueba de punta a punta del servidor: npm run prueba
// Levanta un servidor temporal (puerto 4999, datos en una carpeta temporal) y simula
// un móvil, un reloj y un intruso hablando por WebSocket.

import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PUERTO = 4999;
const URL_WS = `ws://localhost:${PUERTO}`;
const DATOS = join(mkdtempSync(join(tmpdir(), 'encuentrame-')), 'datos.json');
let fallos = 0;
const ok = (cond, msg) => {
  if (!cond) fallos++;
  console.log(`${cond ? '  OK   ' : '  FALLA'} ${msg}`);
};

function arrancarServidor() {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ['servidor.js'], {
      cwd: new URL('.', import.meta.url),
      env: { ...process.env, PUERTO: String(PUERTO), ENCUENTRAME_DATOS: DATOS },
    });
    p.stdout.on('data', (d) => String(d).includes('servidor listo') && resolve(p));
    p.stderr.on('data', (d) => process.stderr.write(d));
    p.on('exit', (c) => c && reject(new Error('El servidor terminó con código ' + c)));
  });
}

function cliente() {
  const ws = new WebSocket(URL_WS);
  const recibidos = [];
  const esperas = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    const i = esperas.findIndex((w) => w.t === m.t);
    if (i >= 0) esperas.splice(i, 1)[0].resolve(m);
    else recibidos.push(m);
  });
  return {
    abierto: new Promise((r) => ws.addEventListener('open', r)),
    enviar: (m) => ws.send(JSON.stringify(m)),
    esperar: (t, ms = 2000) => {
      const i = recibidos.findIndex((m) => m.t === t);
      if (i >= 0) return Promise.resolve(recibidos.splice(i, 1)[0]);
      return new Promise((resolve, reject) => {
        const w = { t, resolve };
        esperas.push(w);
        setTimeout(() => reject(new Error(`No llegó "${t}" en ${ms} ms`)), ms);
      });
    },
    nada: async (t, ms = 400) => {
      await new Promise((r) => setTimeout(r, ms));
      return !recibidos.some((m) => m.t === t);
    },
    cerrar: () => ws.close(),
  };
}

async function main() {
  let servidor = await arrancarServidor();

  const reloj = cliente();
  await reloj.abierto;
  reloj.enviar({ t: 'hola', id: 'reloj-1', rol: 'reloj' });
  ok((await reloj.esperar('bienvenida')).pares.length === 0, 'reloj nuevo sin vínculos');

  reloj.enviar({ t: 'pedirCodigo' });
  const { codigo } = await reloj.esperar('codigo');
  ok(/^\d{6}$/.test(codigo), `código de vinculación ${codigo}`);

  const movil = cliente();
  await movil.abierto;
  movil.enviar({ t: 'hola', id: 'movil-1', rol: 'movil', nombre: 'Papá' });
  await movil.esperar('bienvenida');

  movil.enviar({ t: 'vincular', codigo: '000000', nombre: 'X' });
  ok((await movil.esperar('error')).contexto === 'vincular', 'código incorrecto => error');

  movil.enviar({ t: 'vincular', codigo, nombre: 'Sofía', emoji: '👧', color: '#FF8A3D' });
  const vm = await movil.esperar('vinculado');
  const vr = await reloj.esperar('vinculado');
  ok(vm.par.nombre === 'Sofía' && vm.par.enLinea, 'el móvil ve a "Sofía" en línea');
  ok(vr.par.nombre === 'Papá' && vr.yo.emoji === '👧', 'el reloj sabe que lo vinculó "Papá" y recibe su perfil');

  movil.enviar({ t: 'vincular', codigo, nombre: 'Otra vez' });
  ok((await movil.esperar('error')).contexto === 'vincular', 'un código no se puede usar dos veces');

  reloj.enviar({ t: 'ubicacion', lat: 19.4326, lon: -99.1332, precision: 5, bateria: 0.8 });
  const u = await movil.esperar('ubicacion');
  ok(u.de === 'reloj-1' && u.lat === 19.4326 && u.bateria === 0.8, 'la ubicación del reloj llega al móvil');

  movil.enviar({ t: 'ubicacion', lat: 19.433, lon: -99.133 });
  ok((await reloj.esperar('ubicacion')).de === 'movil-1', 'la ubicación del móvil llega al reloj (para encontrarse mutuamente)');

  movil.enviar({ t: 'comando', para: 'reloj-1', accion: 'sonar' });
  ok((await reloj.esperar('comando')).accion === 'sonar', 'comando "sonar" llega al reloj');

  const intruso = cliente();
  await intruso.abierto;
  intruso.enviar({ t: 'hola', id: 'movil-2', rol: 'movil', nombre: 'Desconocido' });
  await intruso.esperar('bienvenida');
  intruso.enviar({ t: 'comando', para: 'reloj-1', accion: 'mensaje', datos: { texto: 'hola' } });
  ok(await reloj.nada('comando'), 'un móvil NO vinculado no puede mandar comandos');
  ok(await intruso.nada('ubicacion'), 'un móvil NO vinculado no recibe ubicaciones');

  reloj.enviar({ t: 'sos' });
  const sos = await movil.esperar('sos');
  ok(sos.de === 'reloj-1' && sos.ubicacion?.lat === 19.4326, 'el SOS llega al móvil con la última ubicación');

  reloj.cerrar();
  ok((await movil.esperar('presencia')).enLinea === false, 'el móvil se entera cuando el reloj se desconecta');

  // Reinicio del servidor: los vínculos deben sobrevivir.
  servidor.kill();
  await new Promise((r) => setTimeout(r, 300));
  servidor = await arrancarServidor();
  const reloj2 = cliente();
  await reloj2.abierto;
  reloj2.enviar({ t: 'hola', id: 'reloj-1', rol: 'reloj' });
  const b = await reloj2.esperar('bienvenida');
  ok(b.pares.length === 1 && b.pares[0].nombre === 'Papá' && b.yo.nombre === 'Sofía', 'tras reiniciar el servidor el vínculo sigue');

  reloj2.enviar({ t: 'desvincular', con: 'movil-1' });
  ok((await reloj2.esperar('desvinculado')).con === 'movil-1', 'desvincular funciona');

  const r = await fetch(`http://localhost:${PUERTO}/`).then((x) => x.json());
  ok(r.ok && r.app === 'encuentrame-servidor', 'endpoint de salud responde');

  reloj2.cerrar();
  intruso.cerrar();
  movil.cerrar();
  servidor.kill();
  console.log(fallos ? `\n❌ ${fallos} prueba(s) fallaron` : '\n✅ Servidor: todas las pruebas pasaron');
  // Se deja que las conexiones terminen de cerrarse antes de salir (evita un aviso de Node en Windows).
  setTimeout(() => process.exit(fallos ? 1 : 0), 500);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
