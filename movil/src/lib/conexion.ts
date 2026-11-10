// ⚠️ Archivo compartido: debe ser IGUAL en movil/src/lib y reloj/src/lib.
// Conexión WebSocket con el servidor de Encuéntrame, con reconexión automática.

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { MensajeCliente, MensajeServidor } from './protocolo';

/** 'duplicado' = este mismo dispositivo se abrió en otro lugar (otra pestaña) y el servidor cerró esta sesión. */
export type EstadoConexion = 'desconectado' | 'conectando' | 'conectado' | 'duplicado';

export const PUERTO_SERVIDOR = 4000;

/**
 * Dirección del servidor sin configurar nada: el servidor corre en la misma PC
 * que Expo, así que se usa la IP desde la que se cargó la app.
 */
export function urlServidorPorDefecto(): string {
  if (Platform.OS === 'web') {
    // ?servidor=ws://otra-pc:4000 permite apuntar la versión web a otro servidor.
    const elegido = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('servidor') : null;
    if (elegido && /^wss?:\/\//.test(elegido)) return elegido;
    const host = typeof location !== 'undefined' && location.hostname ? location.hostname : 'localhost';
    return `ws://${host}:${PUERTO_SERVIDOR}`;
  }
  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const ip = hostUri.split(':')[0];
  return ip ? `ws://${ip}:${PUERTO_SERVIDOR}` : `ws://192.168.1.100:${PUERTO_SERVIDOR}`;
}

/** Comprueba que el servidor responde (usa su endpoint HTTP de salud). */
export async function probarServidor(url: string): Promise<boolean> {
  const http = url.replace(/^ws/, 'http');
  const control = new AbortController();
  const t = setTimeout(() => control.abort(), 4000);
  try {
    const r = await fetch(http, { signal: control.signal });
    const j = (await r.json()) as { app?: string };
    return j.app === 'encuentrame-servidor';
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

interface Opciones {
  /** Mensaje de presentación que se manda cada vez que se (re)conecta. */
  hola: () => MensajeCliente;
  alMensaje: (m: MensajeServidor) => void;
  alEstado: (e: EstadoConexion) => void;
}

export function crearConexion({ hola, alMensaje, alEstado }: Opciones) {
  let ws: WebSocket | null = null;
  let url = '';
  let activo = false;
  let intentos = 0;
  let reintento: ReturnType<typeof setTimeout> | null = null;
  const cola: MensajeCliente[] = [];

  const cerrarSocket = () => {
    if (reintento) clearTimeout(reintento);
    reintento = null;
    const s = ws;
    ws = null;
    if (s) {
      s.onclose = null;
      s.onmessage = null;
      try {
        s.close();
      } catch {
        // ya estaba cerrado
      }
    }
  };

  const programar = () => {
    if (!activo) return;
    if (reintento) clearTimeout(reintento);
    const espera = Math.min(5000, 700 * 2 ** intentos++);
    reintento = setTimeout(abrir, espera);
  };

  function abrir() {
    if (!activo || !url) return;
    alEstado('conectando');
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      alEstado('desconectado');
      programar();
      return;
    }
    ws = socket;
    socket.onopen = () => {
      intentos = 0;
      socket.send(JSON.stringify(hola()));
      alEstado('conectado');
      while (cola.length) socket.send(JSON.stringify(cola.shift()));
    };
    socket.onmessage = (e) => {
      try {
        alMensaje(JSON.parse(String(e.data)) as MensajeServidor);
      } catch {
        // mensaje mal formado: se ignora
      }
    };
    socket.onerror = () => undefined; // después llega onclose
    socket.onclose = (e) => {
      if (ws !== socket) return;
      ws = null;
      if (e.code === 4000) {
        // El servidor nos reemplazó por otra sesión del mismo dispositivo: no reconectar
        // (si no, las dos sesiones se expulsarían una a otra sin fin).
        activo = false;
        alEstado('duplicado');
        return;
      }
      alEstado('desconectado');
      programar();
    };
  }

  return {
    conectar(nuevaUrl: string) {
      url = nuevaUrl.trim();
      activo = true;
      intentos = 0;
      cerrarSocket();
      abrir();
    },
    desconectar() {
      activo = false;
      cerrarSocket();
      alEstado('desconectado');
    },
    /** Reintenta ya (por ejemplo, cuando la app vuelve a primer plano). */
    reintentar() {
      if (activo && !ws) {
        intentos = 0;
        abrir();
      }
    },
    /** Las ubicaciones no se encolan (solo importa la más reciente); los comandos sí. */
    enviar(m: MensajeCliente, encolar = m.t !== 'ubicacion') {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
      else if (encolar && cola.length < 50) cola.push(m);
    },
  };
}

export type Conexion = ReturnType<typeof crearConexion>;
