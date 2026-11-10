import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vibration } from 'react-native';
import { create } from 'zustand';

import { crearConexion, urlServidorPorDefecto, type EstadoConexion } from '@/lib/conexion';
import { esConfiable, promediarMuestras } from '@/lib/filtroGps';
import { nuevoId } from '@/lib/formato';
import { distancia, textoDistancia, type Punto } from '@/lib/geo';
import type { Accion, DatosComando, MensajeServidor, Par } from '@/lib/protocolo';

export interface MiUbicacion extends Punto {
  precision: number | null;
  ts: number;
}

export interface Preferencias {
  /** Distancia máxima en metros antes de avisar (null = sin límite). */
  zona: number | null;
}

export type TipoAviso = 'info' | 'exito' | 'alerta';
export interface Aviso {
  id: string;
  tipo: TipoAviso;
  titulo: string;
  texto?: string;
  emoji?: string;
}

export interface PerfilNuevo {
  nombre: string;
  emoji: string;
  color: string;
  zona: number | null;
}

export type EstadoVinculacion =
  | { estado: 'inactivo' }
  | { estado: 'enviando' }
  | { estado: 'error'; mensaje: string }
  | { estado: 'listo'; id: string };

interface Estado {
  listo: boolean;
  miId: string;
  miNombre: string;
  /** URL escrita a mano; null = detectar sola. */
  servidorPersonalizado: string | null;
  conexion: EstadoConexion;

  dispositivos: Record<string, Par>;
  prefs: Record<string, Preferencias>;
  fueraDeZona: Record<string, boolean>;

  miUbicacion: MiUbicacion | null;
  miRumbo: number | null;
  permisoUbicacion: 'pendiente' | 'concedido' | 'denegado';
  vibracionCercania: boolean;

  sos: { de: string; ts: number } | null;
  avisos: Aviso[];
  vinculacion: EstadoVinculacion;

  /** Reloj que está haciendo sonar este teléfono (null = no está sonando). */
  sonandoPor: string | null;
  /** Última calibración hecha con cada dispositivo. */
  calibraciones: Record<string, { ts: number; diferencia: number; modo: 'fija' | 'correccion' }>;

  iniciar(): Promise<void>;
  reconectar(): void;
  cambiarServidor(url: string | null): void;
  cambiarNombre(nombre: string): void;
  vincular(codigo: string, perfil: PerfilNuevo): void;
  reiniciarVinculacion(): void;
  enviarComando<A extends Accion>(para: string, accion: A, datos?: DatosComando[A]): void;
  editarDispositivo(id: string, cambios: Partial<PerfilNuevo>): void;
  desvincular(id: string): void;
  actualizarMiUbicacion(u: MiUbicacion): void;
  actualizarMiRumbo(r: number | null): void;
  setPermisoUbicacion(p: Estado['permisoUbicacion']): void;
  setVibracionCercania(v: boolean): void;
  atenderSos(): void;
  avisar(a: Omit<Aviso, 'id'>): void;
  cerrarAviso(id: string): void;
  /** Apaga la alarma de este teléfono (y le avisa al reloj). */
  detenerAlarma(): void;
  /**
   * Calibra con el dispositivo estando juntos: promedia mi GPS unos segundos y se lo manda
   * para que corrija su ubicación. Lanza un Error con el motivo si no se puede.
   */
  calibrar(para: string, alProgreso?: (avance: number, precision: number | null) => void): Promise<DatosComando['calibrado']>;
}

const CLAVE = 'encuentrame:movil';

export function urlServidor(s: Pick<Estado, 'servidorPersonalizado'>): string {
  return s.servidorPersonalizado ?? urlServidorPorDefecto();
}

// ---------------- Conexión con el servidor ----------------

const conexion = crearConexion({
  hola: () => {
    const s = useEncuentrame.getState();
    return { t: 'hola', id: s.miId, rol: 'movil', nombre: s.miNombre };
  },
  alMensaje: (m) => manejarMensaje(m),
  alEstado: (e) => {
    useEncuentrame.setState({ conexion: e });
    if (e === 'conectado') setTimeout(() => enviarMiUbicacion(true), 300);
  },
});

let pendiente: PerfilNuevo | null = null;
let temporizadorVinculacion: ReturnType<typeof setTimeout> | null = null;
let ultimoEnvio = { ts: 0, lat: 0, lon: 0 };

function enviarMiUbicacion(forzar = false) {
  const { miUbicacion: u, miRumbo } = useEncuentrame.getState();
  if (!u) return;
  const ahora = Date.now();
  if (!forzar && ahora - ultimoEnvio.ts < 1000 && distancia(u, ultimoEnvio) < 2) return;
  ultimoEnvio = { ts: ahora, lat: u.lat, lon: u.lon };
  conexion.enviar({ t: 'ubicacion', lat: u.lat, lon: u.lon, precision: u.precision, rumbo: miRumbo, bateria: null });
}

/** El GPS "salta" unos metros: la salida y el regreso se confirman solo si duran este tiempo. */
const CONFIRMAR_SALIDA_MS = 3000;
const CONFIRMAR_REGRESO_MS = 2000;
const desdeFuera: Record<string, number> = {};
const desdeDentro: Record<string, number> = {};

/** Avisa (y le avisa al reloj) cuando alguien sale o regresa de su zona segura. */
function revisarZonas() {
  const s = useEncuentrame.getState();
  if (!s.miUbicacion) return;
  const ahora = Date.now();
  const cambios: Record<string, boolean> = {};
  for (const d of Object.values(s.dispositivos)) {
    const limite = s.prefs[d.id]?.zona ?? null;
    const estaba = !!s.fueraDeZona[d.id];
    if (!limite || !d.ubicacion) {
      if (estaba) cambios[d.id] = false;
      delete desdeFuera[d.id];
      delete desdeDentro[d.id];
      continue;
    }
    // Si el error del GPS de alguno es mayor que el límite, no se puede saber si salió: se espera.
    const incertidumbre = Math.max(s.miUbicacion.precision ?? 0, d.ubicacion.precision ?? 0);
    if (!esConfiable(s.miUbicacion.precision) || !esConfiable(d.ubicacion.precision) || incertidumbre > Math.max(limite, 25)) {
      delete desdeFuera[d.id];
      delete desdeDentro[d.id];
      continue;
    }
    const m = distancia(s.miUbicacion, d.ubicacion);
    const pasado = m > limite;
    const adentro = m <= limite * 0.8;
    if (!estaba) {
      if (pasado) desdeFuera[d.id] ??= ahora;
      else delete desdeFuera[d.id];
    } else if (adentro) desdeDentro[d.id] ??= ahora;
    else delete desdeDentro[d.id];

    if (!estaba && pasado && ahora - desdeFuera[d.id] >= CONFIRMAR_SALIDA_MS) {
      delete desdeFuera[d.id];
      cambios[d.id] = true;
      s.avisar({ tipo: 'alerta', titulo: `${d.nombre} se está alejando`, texto: `Está a ${textoDistancia(m)} (límite ${limite} m).` });
      Vibration.vibrate([0, 400, 200, 400]);
      conexion.enviar({ t: 'comando', para: d.id, accion: 'zona', datos: { fuera: true, metros: Math.round(m), limite } });
    } else if (estaba && adentro && ahora - desdeDentro[d.id] >= CONFIRMAR_REGRESO_MS) {
      delete desdeDentro[d.id];
      cambios[d.id] = false;
      s.avisar({ tipo: 'exito', titulo: `${d.nombre} volvió a la zona`, texto: `Está a ${textoDistancia(m)}.` });
      conexion.enviar({ t: 'comando', para: d.id, accion: 'zona', datos: { fuera: false, metros: Math.round(m), limite } });
    }
  }
  if (Object.keys(cambios).length) useEncuentrame.setState({ fueraDeZona: { ...s.fueraDeZona, ...cambios } });
}

const esperasCalibracion = new Map<string, (r: DatosComando['calibrado']) => void>();

/** Promedia mi ubicación durante `ms` (con el teléfono quieto da una posición más exacta). */
async function promediarMiUbicacion(ms: number, alProgreso?: (avance: number, precision: number | null) => void) {
  const muestras: MiUbicacion[] = [];
  const inicial = useEncuentrame.getState().miUbicacion;
  if (inicial) muestras.push(inicial);
  const cancelar = useEncuentrame.subscribe((a, b) => {
    if (a.miUbicacion && a.miUbicacion !== b.miUbicacion) muestras.push(a.miUbicacion);
  });
  const inicio = Date.now();
  await new Promise<void>((resolve) => {
    const t = setInterval(() => {
      const avance = Math.min(1, (Date.now() - inicio) / ms);
      alProgreso?.(avance, promediarMuestras(muestras)?.precision ?? null);
      if (avance >= 1) {
        clearInterval(t);
        resolve();
      }
    }, 250);
  });
  cancelar();
  return promediarMuestras(muestras);
}

function actualizarDispositivo(id: string, cambio: (d: Par) => Par) {
  useEncuentrame.setState((s) => (s.dispositivos[id] ? { dispositivos: { ...s.dispositivos, [id]: cambio(s.dispositivos[id]) } } : {}));
}

function manejarMensaje(m: MensajeServidor) {
  const s = useEncuentrame.getState();
  switch (m.t) {
    case 'bienvenida':
      useEncuentrame.setState({ dispositivos: Object.fromEntries(m.pares.map((p) => [p.id, p])) });
      revisarZonas();
      return;

    case 'vinculado': {
      useEncuentrame.setState((e) => ({ dispositivos: { ...e.dispositivos, [m.par.id]: m.par } }));
      if (s.vinculacion.estado === 'enviando') {
        if (temporizadorVinculacion) clearTimeout(temporizadorVinculacion);
        useEncuentrame.setState((e) => ({
          prefs: { ...e.prefs, [m.par.id]: { zona: pendiente?.zona ?? null } },
          vinculacion: { estado: 'listo', id: m.par.id },
        }));
        pendiente = null;
      }
      s.avisar({ tipo: 'exito', titulo: `¡${m.par.nombre} está vinculado!`, texto: 'Ya puedes encontrarlo con la flecha.' });
      return;
    }

    case 'perfil':
      if (m.perfil.id !== s.miId) actualizarDispositivo(m.perfil.id, (d) => ({ ...d, ...m.perfil }));
      return;

    case 'presencia':
      actualizarDispositivo(m.id, (d) => ({ ...d, enLinea: m.enLinea }));
      return;

    case 'ubicacion': {
      const { t: _t, de, ...u } = m;
      actualizarDispositivo(de, (d) => ({ ...d, ubicacion: u, enLinea: true }));
      revisarZonas();
      return;
    }

    case 'comando': {
      const d = s.dispositivos[m.de];
      if (!d) return;
      if (m.accion === 'calibrado') {
        esperasCalibracion.get(m.de)?.(m.datos);
        esperasCalibracion.delete(m.de);
        return;
      }
      if (m.accion === 'sonar') {
        // El reloj está buscando este teléfono.
        useEncuentrame.setState({ sonandoPor: m.de });
      } else if (m.accion === 'detenerSonido') {
        if (useEncuentrame.getState().sonandoPor === m.de) useEncuentrame.setState({ sonandoPor: null });
      }
      return;
    }

    case 'sos': {
      if (m.ubicacion) {
        const u = m.ubicacion;
        actualizarDispositivo(m.de, (d) => ({ ...d, ubicacion: u }));
      }
      useEncuentrame.setState({ sos: { de: m.de, ts: m.ts } });
      Vibration.vibrate([0, 800, 400, 800, 400], true);
      return;
    }

    case 'desvinculado': {
      const d = s.dispositivos[m.con];
      useEncuentrame.setState((e) => {
        const dispositivos = { ...e.dispositivos };
        delete dispositivos[m.con];
        return { dispositivos };
      });
      if (d) s.avisar({ tipo: 'info', titulo: `${d.nombre} fue desvinculado` });
      return;
    }

    case 'error':
      if (m.contexto === 'vincular' && s.vinculacion.estado === 'enviando') {
        if (temporizadorVinculacion) clearTimeout(temporizadorVinculacion);
        useEncuentrame.setState({ vinculacion: { estado: 'error', mensaje: m.mensaje } });
      }
      return;
  }
}

// ---------------- Persistencia local ----------------

const firmaDispositivos = (ds: Record<string, Par>) =>
  Object.values(ds)
    .map((d) => `${d.id}|${d.nombre}|${d.emoji}|${d.color}`)
    .sort()
    .join(';');

function guardar() {
  const s = useEncuentrame.getState();
  const dispositivos = Object.fromEntries(
    Object.values(s.dispositivos).map((d) => [d.id, { ...d, ubicacion: null, enLinea: false }]),
  );
  AsyncStorage.setItem(
    CLAVE,
    JSON.stringify({
      miId: s.miId,
      miNombre: s.miNombre,
      servidorPersonalizado: s.servidorPersonalizado,
      prefs: s.prefs,
      vibracionCercania: s.vibracionCercania,
      dispositivos,
    }),
  ).catch(() => undefined);
}

// ---------------- Store ----------------

export const useEncuentrame = create<Estado>()((set, get) => ({
  listo: false,
  miId: '',
  miNombre: 'Papá',
  servidorPersonalizado: null,
  conexion: 'desconectado',
  dispositivos: {},
  prefs: {},
  fueraDeZona: {},
  miUbicacion: null,
  miRumbo: null,
  permisoUbicacion: 'pendiente',
  vibracionCercania: true,
  sos: null,
  avisos: [],
  vinculacion: { estado: 'inactivo' },
  sonandoPor: null,
  calibraciones: {},

  iniciar: async () => {
    if (get().listo) return;
    let g: Partial<Estado> = {};
    try {
      const texto = await AsyncStorage.getItem(CLAVE);
      if (texto) g = JSON.parse(texto);
    } catch {
      // sin datos guardados
    }
    set({
      listo: true,
      miId: g.miId ?? `m-${nuevoId()}`,
      miNombre: g.miNombre ?? 'Papá',
      servidorPersonalizado: g.servidorPersonalizado ?? null,
      prefs: g.prefs ?? {},
      vibracionCercania: g.vibracionCercania ?? true,
      dispositivos: g.dispositivos ?? {},
    });
    guardar(); // guarda el id nuevo la primera vez

    let t: ReturnType<typeof setTimeout> | null = null;
    useEncuentrame.subscribe((a, b) => {
      const cambio =
        a.miNombre !== b.miNombre ||
        a.servidorPersonalizado !== b.servidorPersonalizado ||
        a.prefs !== b.prefs ||
        a.vibracionCercania !== b.vibracionCercania ||
        firmaDispositivos(a.dispositivos) !== firmaDispositivos(b.dispositivos);
      if (!cambio) return;
      if (t) clearTimeout(t);
      t = setTimeout(guardar, 400);
    });

    conexion.conectar(urlServidor(get()));
    // Aunque no te muevas, se reenvía la ubicación cada 5 s (para quien se acaba de conectar).
    setInterval(() => enviarMiUbicacion(true), 5000);
  },

  reconectar: () => conexion.reintentar(),

  cambiarServidor: (url) => {
    const limpio = url?.trim() || null;
    set({ servidorPersonalizado: limpio });
    conexion.conectar(urlServidor(get()));
  },

  cambiarNombre: (nombre) => {
    const n = nombre.trim();
    if (!n) return;
    set({ miNombre: n });
    conexion.enviar({ t: 'perfil', nombre: n });
  },

  vincular: (codigo, perfil) => {
    if (get().conexion !== 'conectado') {
      set({ vinculacion: { estado: 'error', mensaje: 'No hay conexión con el servidor de Encuéntrame. Revisa Ajustes.' } });
      return;
    }
    pendiente = perfil;
    set({ vinculacion: { estado: 'enviando' } });
    conexion.enviar({ t: 'vincular', codigo, nombre: perfil.nombre, emoji: perfil.emoji, color: perfil.color });
    if (temporizadorVinculacion) clearTimeout(temporizadorVinculacion);
    temporizadorVinculacion = setTimeout(() => {
      if (get().vinculacion.estado === 'enviando') {
        set({ vinculacion: { estado: 'error', mensaje: 'El servidor no respondió. Intenta de nuevo.' } });
      }
    }, 8000);
  },

  reiniciarVinculacion: () => set({ vinculacion: { estado: 'inactivo' } }),

  enviarComando: (para, accion, datos) => conexion.enviar({ t: 'comando', para, accion, datos }),

  editarDispositivo: (id, cambios) => {
    const { zona, ...perfil } = cambios;
    if (zona !== undefined) set((s) => ({ prefs: { ...s.prefs, [id]: { ...s.prefs[id], zona } } }));
    if (Object.keys(perfil).length) {
      actualizarDispositivo(id, (d) => ({ ...d, ...perfil }));
      conexion.enviar({ t: 'perfil', para: id, ...perfil });
    }
    revisarZonas();
  },

  desvincular: (id) => {
    conexion.enviar({ t: 'desvincular', con: id });
    set((s) => {
      const dispositivos = { ...s.dispositivos };
      delete dispositivos[id];
      const prefs = { ...s.prefs };
      delete prefs[id];
      return { dispositivos, prefs };
    });
  },

  actualizarMiUbicacion: (u) => {
    set({ miUbicacion: u });
    enviarMiUbicacion();
    revisarZonas();
  },

  actualizarMiRumbo: (r) => set({ miRumbo: r }),
  setPermisoUbicacion: (p) => set({ permisoUbicacion: p }),
  setVibracionCercania: (v) => set({ vibracionCercania: v }),

  atenderSos: () => {
    const sos = get().sos;
    Vibration.cancel();
    if (sos) conexion.enviar({ t: 'comando', para: sos.de, accion: 'sosRecibido' });
    set({ sos: null });
  },

  avisar: (a) => {
    const aviso = { ...a, id: nuevoId() };
    set((s) => ({ avisos: [...s.avisos, aviso].slice(-3) }));
    setTimeout(() => get().cerrarAviso(aviso.id), 5000);
  },

  cerrarAviso: (id) => set((s) => ({ avisos: s.avisos.filter((x) => x.id !== id) })),

  detenerAlarma: () => {
    const quien = get().sonandoPor;
    if (quien) conexion.enviar({ t: 'comando', para: quien, accion: 'detenerSonido' });
    set({ sonandoPor: null });
  },

  calibrar: async (para, alProgreso) => {
    if (get().conexion !== 'conectado') throw new Error('No hay conexión con el servidor.');
    if (!get().dispositivos[para]?.enLinea) throw new Error('El reloj está desconectado.');
    const punto = await promediarMiUbicacion(5000, alProgreso);
    if (!punto) throw new Error('Todavía no tengo tu ubicación. Revisa que el GPS esté activo.');
    const respuesta = new Promise<DatosComando['calibrado']>((resolve, reject) => {
      const t = setTimeout(() => {
        esperasCalibracion.delete(para);
        reject(new Error('El reloj no respondió. Intenta de nuevo.'));
      }, 8000);
      esperasCalibracion.set(para, (r) => {
        clearTimeout(t);
        resolve(r);
      });
    });
    // El rumbo de la brújula le dice a un reloj sin brújula (la PC) hacia dónde mira su pantalla.
    const rumbo = get().miRumbo;
    conexion.enviar({ t: 'comando', para, accion: 'calibrar', datos: { lat: punto.lat, lon: punto.lon, precision: punto.precision, rumbo } });
    const r = await respuesta;
    set((s) => ({ calibraciones: { ...s.calibraciones, [para]: { ts: Date.now(), diferencia: r.diferencia, modo: r.modo } } }));
    return r;
  },
}));
