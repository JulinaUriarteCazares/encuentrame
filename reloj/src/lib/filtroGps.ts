// ⚠️ Archivo compartido: debe ser IGUAL en movil/src/lib y reloj/src/lib.
// Hace más precisa la ubicación: promedia las últimas lecturas del GPS (dando más peso a
// las más precisas) y descarta las que son mucho peores. Si la persona camina, se reinicia
// para no quedarse atrás.

import { distancia, norm180, type Punto } from './geo';

export interface Muestra extends Punto {
  precision: number | null;
  ts: number;
}

const precisionDe = (m: Muestra) => Math.max(2, m.precision ?? 30);

/**
 * Más allá de esta precisión (m) una ubicación no sirve para buscar a alguien.
 * Pasa con una PC: no tiene GPS y el navegador la ubica por internet, a veces a miles de km.
 */
export const PRECISION_UTIL = 150;

/** ¿La ubicación es lo bastante precisa para medir distancias y dar alertas? */
export function esConfiable(precision: number | null | undefined): boolean {
  return (precision ?? 0) <= PRECISION_UTIL;
}

function promedio(muestras: Muestra[]): Muestra {
  let peso = 0;
  let lat = 0;
  let lon = 0;
  for (const m of muestras) {
    const w = 1 / precisionDe(m) ** 2;
    peso += w;
    lat += m.lat * w;
    lon += m.lon * w;
  }
  const mejor = Math.min(...muestras.map(precisionDe));
  return {
    lat: lat / peso,
    lon: lon / peso,
    // El promedio de varias lecturas es más preciso que una sola.
    precision: Math.round(Math.max(2, mejor / Math.sqrt(muestras.length)) * 10) / 10,
    ts: muestras[muestras.length - 1].ts,
  };
}

export class FiltroGPS {
  private muestras: Muestra[] = [];

  constructor(
    private ventanaMs = 6000,
    private maximo = 6,
  ) {}

  agregar(m: Muestra): Muestra {
    const previas = this.muestras.filter((x) => m.ts - x.ts <= this.ventanaMs);
    if (previas.length) {
      const actual = promedio(previas);
      // Si la nueva lectura está claramente lejos del promedio, la persona se movió: se reinicia.
      if (distancia(actual, m) > Math.max(6, precisionDe(m) * 1.5)) previas.length = 0;
    }
    const todas = [...previas, m].slice(-this.maximo);
    const mejor = Math.min(...todas.map(precisionDe));
    // Se descartan lecturas mucho peores que la mejor reciente (rebotes del GPS).
    this.muestras = todas.filter((x) => precisionDe(x) <= Math.max(mejor * 2.5, 10));
    return promedio(this.muestras);
  }

  reiniciar() {
    this.muestras = [];
  }
}

/** Promedia una lista de lecturas (para calibrar). */
export function promediarMuestras(muestras: Muestra[]): Muestra | null {
  return muestras.length ? promedio(muestras) : null;
}

/** Suaviza la brújula (que tiembla): se acerca un 30% al nuevo valor cada lectura. */
export function suavizarRumbo(anterior: number | null, nuevo: number, factor = 0.3): number {
  if (anterior == null) return nuevo;
  return (((anterior + norm180(nuevo - anterior) * factor) % 360) + 360) % 360;
}
