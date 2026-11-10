import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { crearConexion, urlServidorPorDefecto, type EstadoConexion } from '@/lib/conexion';
import { nuevoId } from '@/lib/formato';
import { desplazar, diferencia, distancia, type Punto } from '@/lib/geo';
import type { DatosComando, MensajeServidor, Par, Perfil } from '@/lib/protocolo';

export interface MiUbicacion extends Punto {
  precision: number | null;
  ts: number;
}

/**
 * - real: GPS del dispositivo (en una PC, la ubicación aproximada del navegador).
 * - fija: un punto fijo, tomado del GPS del teléfono cuando estaba junto al reloj (lo más preciso para una PC).
 * - simulada: se mueve desde el panel de pruebas (solo para demostraciones).
 */
export type ModoUbicacion = 'real' | 'fija' | 'simulada';

interface Estado {
  listo: boolean;
  /** En web: número de reloj emulado (?reloj=2 abre un segundo reloj). */
  ranura: string;
  miId: string;
  servidorPersonalizado: string | null;
  conexion: EstadoConexion;

  yo: Perfil | null;
  guardianes: Record<string, Par>;
  /** Guardián al que apunta la flecha del reloj. */
  activo: string | null;
  codigo: { codigo: string; expira: number } | null;
  /** Mostrar la pantalla de código aunque ya esté vinculado (para vincular otro teléfono). */
  mostrarCodigo: boolean;

  miUbicacion: MiUbicacion | null;
  /** Brújula real (null si el dispositivo no tiene). */
  rumboBrujula: number | null;
  /** Precisión (m) de la última lectura descartada por mala; null si el GPS va bien. */
  gpsImpreciso: number | null;
  modo: ModoUbicacion;
  posicionFija: (Punto & { precision: number | null }) | null;
  /** Punto de partida de la simulación. */
  ancla: Punto | null;
  /** Posición simulada en metros respecto al ancla. */
  offset: { este: number; norte: number };
  rumboSimulado: number;
  paseo: boolean;
  bateria: number | null;
  sonidoActivo: boolean;
  /** Panel de pruebas del emulador (oculto salvo que se active). */
  panelPruebas: boolean;

  sonando: boolean;
  /** Este reloj está haciendo sonar el teléfono. */
  sonandoTelefono: boolean;
  zona: (DatosComando['zona'] & { de: string; ts: number }) | null;
  sos: { estado: 'enviado' | 'confirmado'; ts: number } | null;
  encontrado: { de: string; ts: number } | null;
  vinculadoReciente: { nombre: string; ts: number } | null;
  /** Corrección (m) que se suma al GPS real tras calibrar con el teléfono. */
  correccion: { este: number; norte: number } | null;
  calibradoReciente: { ts: number; diferencia: number; modo: 'fija' | 'correccion' } | null;

  iniciar(): Promise<void>;
  reconectar(): void;
  cambiarServidor(url: string | null): void;
  pedirCodigo(): void;
  setMostrarCodigo(v: boolean): void;
  setModo(m: ModoUbicacion): void;
  /** Usa la ubicación actual del teléfono como posición fija del reloj. */
  fijarConTelefono(): boolean;
  setOffset(o: { este: number; norte: number }): void;
  setRumboSimulado(r: number): void;
  setPaseo(v: boolean): void;
  recentrar(): void;
  setSonidoActivo(v: boolean): void;
  setPanelPruebas(v: boolean): void;
  actualizarMiUbicacion(u: MiUbicacion): void;
  setRumboBrujula(r: number | null): void;
  setGpsImpreciso(p: number | null): void;
  setBateria(b: number | null): void;
  siguienteGuardian(): void;
  enviarSos(): void;
  /** Hace sonar (o deja de hacer sonar) el teléfono del guardián activo. */
  alternarSonarTelefono(): void;
  detenerSonido(): void;
  cerrar(que: 'zona' | 'sos' | 'encontrado' | 'vinculadoReciente' | 'calibradoReciente'): void;
  quitarCorreccion(): void;
  desvincular(id: string): void;
}

/** Rumbo efectivo del reloj: brújula real si existe; si no, el simulado. */
export function rumboReloj(s: Pick<Estado, 'rumboBrujula' | 'rumboSimulado'>): number {
  return s.rumboBrujula ?? s.rumboSimulado;
}

/** Guardián activo (o el primero que haya). */
export function guardianActivo(s: Pick<Estado, 'guardianes' | 'activo'>): Par | null {
  return (s.activo && s.guardianes[s.activo]) || Object.values(s.guardianes)[0] || null;
}

export function urlServidor(s: Pick<Estado, 'servidorPersonalizado'>): string {
  return s.servidorPersonalizado ?? urlServidorPorDefecto();
}

function parametroWeb(nombre: string): string | null {
  if (Platform.OS !== 'web' || typeof location === 'undefined') return null;
  return new URLSearchParams(location.search).get(nombre);
}

function ranuraWeb(): string {
  const r = parametroWeb('reloj');
  return r && /^\d{1,2}$/.test(r) ? r : '1';
}

// ---------------- Conexión ----------------

const conexion = crearConexion({
  hola: () => ({ t: 'hola', id: useReloj.getState().miId, rol: 'reloj' }),
  alMensaje: (m) => manejarMensaje(m),
  alEstado: (e) => {
    useReloj.setState({ conexion: e });
    if (e === 'conectado') setTimeout(() => enviarMiUbicacion(true), 300);
  },
});

let ultimoEnvio = { ts: 0, lat: 0, lon: 0 };
let ultimaCruda: Punto | null = null;
function enviarMiUbicacion(forzar = false) {
  const s = useReloj.getState();
  const u = s.miUbicacion;
  if (!u) return;
  const ahora = Date.now();
  if (!forzar && ahora - ultimoEnvio.ts < 900 && distancia(u, ultimoEnvio) < 1) return;
  ultimoEnvio = { ts: ahora, lat: u.lat, lon: u.lon };
  conexion.enviar({ t: 'ubicacion', lat: u.lat, lon: u.lon, precision: u.precision, rumbo: rumboReloj(s), bateria: s.bateria });
}

function actualizarGuardian(id: string, cambio: (p: Par) => Par) {
  useReloj.setState((s) => (s.guardianes[id] ? { guardianes: { ...s.guardianes, [id]: cambio(s.guardianes[id]) } } : {}));
}

function manejarMensaje(m: MensajeServidor) {
  procesar(m);
  // La primera ubicación conocida del guardián fija el punto de partida de la simulación.
  const e = useReloj.getState();
  if (!e.ancla) {
    const u = guardianActivo(e)?.ubicacion;
    if (u) useReloj.setState({ ancla: { lat: u.lat, lon: u.lon } });
  }
}

function procesar(m: MensajeServidor) {
  const s = useReloj.getState();
  switch (m.t) {
    case 'bienvenida': {
      const guardianes = Object.fromEntries(m.pares.map((p) => [p.id, p]));
      useReloj.setState({ yo: m.yo, guardianes, activo: s.activo && guardianes[s.activo] ? s.activo : (m.pares[0]?.id ?? null) });
      if (!m.pares.length || s.mostrarCodigo) s.pedirCodigo();
      return;
    }
    case 'codigo':
      useReloj.setState({ codigo: { codigo: m.codigo, expira: m.expira } });
      return;
    case 'vinculado':
      useReloj.setState((e) => ({
        guardianes: { ...e.guardianes, [m.par.id]: m.par },
        yo: m.yo ?? e.yo,
        activo: m.par.id,
        codigo: null,
        mostrarCodigo: false,
        vinculadoReciente: { nombre: m.par.nombre, ts: Date.now() },
      }));
      return;
    case 'perfil':
      if (m.perfil.id === s.miId) useReloj.setState({ yo: m.perfil });
      else actualizarGuardian(m.perfil.id, (p) => ({ ...p, ...m.perfil }));
      return;
    case 'presencia':
      actualizarGuardian(m.id, (p) => ({ ...p, enLinea: m.enLinea }));
      return;
    case 'ubicacion': {
      const { t: _t, de, ...u } = m;
      actualizarGuardian(de, (p) => ({ ...p, ubicacion: u, enLinea: true }));
      return;
    }
    case 'comando':
      switch (m.accion) {
        case 'sonar':
          useReloj.setState({ sonando: true });
          return;
        case 'detenerSonido':
          // Sirve en los dos sentidos: apaga la alarma del reloj o avisa que el teléfono ya se encontró.
          useReloj.setState({ sonando: false, sonandoTelefono: false });
          return;
        case 'calibrar': {
          // El teléfono está junto al reloj y manda su posición promediada.
          const e = useReloj.getState();
          const punto = { lat: m.datos.lat, lon: m.datos.lon };
          const antes = e.modo === 'real' ? ultimaCruda : e.miUbicacion;
          const dif = antes ? Math.round(distancia(antes, punto)) : 0;
          let modo: 'fija' | 'correccion';
          if (Platform.OS === 'web' || e.modo !== 'real' || !antes) {
            // Reloj en una PC (no se mueve): queda fijo en ese punto exacto.
            modo = 'fija';
            useReloj.setState({ modo: 'fija', posicionFija: { ...punto, precision: m.datos.precision }, ancla: punto, correccion: null });
          } else {
            // Reloj con GPS propio: se corrige el sesgo de su GPS respecto al del teléfono.
            modo = 'correccion';
            useReloj.setState({ correccion: diferencia(antes, punto) });
          }
          // Sin brújula propia (PC), la flecha toma la orientación de la brújula del teléfono:
          // el teléfono estaba junto a la pantalla, apuntando hacia ella, así que "arriba" en el reloj
          // queda hacia donde mira la pantalla y la flecha apunta de verdad al teléfono.
          const orientado = e.rumboBrujula == null && m.datos.rumbo != null;
          if (orientado) useReloj.setState({ rumboSimulado: Math.round(m.datos.rumbo!) % 360, paseo: false });
          useReloj.setState({ calibradoReciente: { ts: Date.now(), diferencia: dif, modo } });
          conexion.enviar({ t: 'comando', para: m.de, accion: 'calibrado', datos: { modo, diferencia: dif, orientado } });
          return;
        }
        case 'zona':
          useReloj.setState({ zona: { ...m.datos, de: m.de, ts: m.ts } });
          return;
        case 'encontrado':
          useReloj.setState({ encontrado: { de: m.de, ts: m.ts }, sonando: false, zona: null });
          return;
        case 'sosRecibido':
          useReloj.setState((e) => ({ sos: e.sos ? { ...e.sos, estado: 'confirmado' } : { estado: 'confirmado', ts: m.ts } }));
          return;
      }
      return;
    case 'desvinculado': {
      useReloj.setState((e) => {
        const guardianes = { ...e.guardianes };
        delete guardianes[m.con];
        return { guardianes, activo: e.activo === m.con ? (Object.keys(guardianes)[0] ?? null) : e.activo };
      });
      if (!Object.keys(useReloj.getState().guardianes).length) useReloj.getState().pedirCodigo();
      return;
    }
  }
}

// ---------------- Persistencia ----------------

const clave = () => `encuentrame:reloj:${useReloj.getState().ranura}`;

function guardar() {
  const s = useReloj.getState();
  AsyncStorage.setItem(
    clave(),
    JSON.stringify({
      miId: s.miId,
      servidorPersonalizado: s.servidorPersonalizado,
      modo: s.modo,
      posicionFija: s.posicionFija,
      correccion: s.correccion,
      offset: s.offset,
      rumboSimulado: s.rumboSimulado,
      ancla: s.ancla,
      yo: s.yo,
      guardianes: Object.fromEntries(Object.values(s.guardianes).map((g) => [g.id, { ...g, ubicacion: null, enLinea: false }])),
      activo: s.activo,
      // Solo se guardan los textos (los audios pesan demasiado para el almacenamiento del navegador).
    }),
  ).catch(() => undefined);
}

// ---------------- Store ----------------

export const useReloj = create<Estado>()((set, get) => ({
  listo: false,
  ranura: ranuraWeb(),
  miId: '',
  servidorPersonalizado: null,
  conexion: 'desconectado',
  yo: null,
  guardianes: {},
  activo: null,
  codigo: null,
  mostrarCodigo: false,
  miUbicacion: null,
  rumboBrujula: null,
  gpsImpreciso: null,
  modo: 'real',
  posicionFija: null,
  ancla: null,
  offset: { este: 35, norte: 25 },
  rumboSimulado: 0,
  paseo: false,
  bateria: null,
  sonidoActivo: true,
  panelPruebas: parametroWeb('panel') === '1',
  sonando: false,
  sonandoTelefono: false,
  zona: null,
  sos: null,
  encontrado: null,
  vinculadoReciente: null,
  correccion: null,
  calibradoReciente: null,

  iniciar: async () => {
    if (get().listo) return;
    let g: Partial<Estado> = {};
    try {
      const texto = await AsyncStorage.getItem(clave());
      if (texto) g = JSON.parse(texto);
    } catch {
      // primera vez
    }
    const modoUrl = parametroWeb('modo') as ModoUbicacion | null;
    set({
      listo: true,
      miId: g.miId ?? `r-${nuevoId()}`,
      servidorPersonalizado: g.servidorPersonalizado ?? null,
      modo: modoUrl && ['real', 'fija', 'simulada'].includes(modoUrl) ? modoUrl : (g.modo ?? 'real'),
      posicionFija: g.posicionFija ?? null,
      correccion: g.correccion ?? null,
      offset: g.offset ?? get().offset,
      rumboSimulado: g.rumboSimulado ?? 0,
      ancla: g.ancla ?? null,
      yo: g.yo ?? null,
      guardianes: g.guardianes ?? {},
      activo: g.activo ?? null,
    });
    guardar();

    let t: ReturnType<typeof setTimeout> | null = null;
    useReloj.subscribe((a, b) => {
      if (
        a.servidorPersonalizado === b.servidorPersonalizado &&
        a.modo === b.modo &&
        a.posicionFija === b.posicionFija &&
        a.correccion === b.correccion &&
        a.offset === b.offset &&
        a.rumboSimulado === b.rumboSimulado &&
        a.ancla === b.ancla &&
        a.yo === b.yo &&
        a.activo === b.activo &&
        Object.keys(a.guardianes).join() === Object.keys(b.guardianes).join()
      )
        return;
      if (t) clearTimeout(t);
      t = setTimeout(guardar, 500);
    });

    conexion.conectar(urlServidor(get()));
    // Aunque no se mueva, se reenvía la ubicación cada 5 s (para quien se acaba de conectar).
    setInterval(() => enviarMiUbicacion(true), 5000);
  },

  reconectar: () => conexion.reintentar(),

  cambiarServidor: (url) => {
    set({ servidorPersonalizado: url?.trim() || null });
    conexion.conectar(urlServidor(get()));
  },

  pedirCodigo: () => conexion.enviar({ t: 'pedirCodigo' }),

  setMostrarCodigo: (v) => {
    set({ mostrarCodigo: v });
    if (v) get().pedirCodigo();
  },

  setModo: (modo) => set({ modo, miUbicacion: null, rumboBrujula: modo === 'real' ? get().rumboBrujula : null }),

  fijarConTelefono: () => {
    const u = guardianActivo(get())?.ubicacion;
    if (!u) return false;
    set({ modo: 'fija', posicionFija: { lat: u.lat, lon: u.lon, precision: u.precision }, ancla: { lat: u.lat, lon: u.lon } });
    // Sin brújula propia, también toma hacia dónde mira el teléfono (que está junto a la pantalla).
    if (get().rumboBrujula == null && u.rumbo != null) set({ rumboSimulado: Math.round(u.rumbo) % 360, paseo: false });
    return true;
  },

  setOffset: (offset) => set({ offset }),
  setRumboSimulado: (r) => set({ rumboSimulado: ((r % 360) + 360) % 360 }),
  setPaseo: (paseo) => set({ paseo }),
  recentrar: () => {
    const g = guardianActivo(get());
    if (g?.ubicacion) set({ ancla: { lat: g.ubicacion.lat, lon: g.ubicacion.lon } });
  },
  setSonidoActivo: (sonidoActivo) => set({ sonidoActivo }),
  setPanelPruebas: (panelPruebas) => set({ panelPruebas }),

  actualizarMiUbicacion: (u) => {
    const { modo, correccion } = get();
    let final = u;
    if (modo === 'real') {
      ultimaCruda = { lat: u.lat, lon: u.lon };
      if (correccion) final = { ...u, ...desplazar(u, correccion.este, correccion.norte) };
    }
    set({ miUbicacion: final });
    enviarMiUbicacion();
  },
  setRumboBrujula: (r) => set({ rumboBrujula: r }),
  setGpsImpreciso: (p) => {
    if (get().gpsImpreciso !== p) set({ gpsImpreciso: p });
  },
  setBateria: (bateria) => set({ bateria }),

  siguienteGuardian: () => {
    const ids = Object.keys(get().guardianes);
    if (ids.length < 2) return;
    const i = ids.indexOf(get().activo ?? '');
    set({ activo: ids[(i + 1) % ids.length] });
  },

  enviarSos: () => {
    conexion.enviar({ t: 'sos' });
    set({ sos: { estado: 'enviado', ts: Date.now() } });
  },

  alternarSonarTelefono: () => {
    const g = guardianActivo(get());
    if (!g) return;
    const nuevo = !get().sonandoTelefono;
    conexion.enviar({ t: 'comando', para: g.id, accion: nuevo ? 'sonar' : 'detenerSonido' });
    set({ sonandoTelefono: nuevo });
    // Se apaga sola a los 45 s, igual que la alarma del teléfono.
    if (nuevo) setTimeout(() => useReloj.setState({ sonandoTelefono: false }), 45000);
  },

  detenerSonido: () => set({ sonando: false }),

  cerrar: (que) => set({ [que]: null } as Partial<Estado>),

  desvincular: (id) => conexion.enviar({ t: 'desvincular', con: id }),

  quitarCorreccion: () => set({ correccion: null }),
}));
