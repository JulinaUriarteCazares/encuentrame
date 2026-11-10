import { esConfiable } from './filtroGps';
import { anguloFlecha, distancia, rumbo, type Punto } from './geo';
import type { UbicacionRemota } from './protocolo';

export function nuevoId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function haceCuanto(ts: number | null | undefined, ahora = Date.now()): string {
  if (!ts) return '';
  const s = Math.max(0, Math.round((ahora - ts) / 1000));
  if (s < 5) return 'justo ahora';
  if (s < 60) return `hace ${s} s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
}

export function textoBateria(b: number | null | undefined): string | null {
  if (b == null || b < 0) return null;
  return `${Math.round(b * 100)}%`;
}

export interface Relacion {
  distancia: number;
  rumbo: number;
  /** Ángulo de la flecha en pantalla (relativo a hacia dónde apunta el teléfono). */
  angulo: number;
  /** Peor precisión de los dos GPS (m). */
  precision: number;
}

/** Hay ubicaciones de los dos, pero alguna es demasiado imprecisa para usarla. */
export function ubicacionImprecisa(
  yo: { precision: number | null } | null,
  otro: { precision: number | null } | null | undefined,
): boolean {
  return !!yo && !!otro && (!esConfiable(yo.precision) || !esConfiable(otro.precision));
}

/**
 * Distancia y dirección entre mi posición y la de otro dispositivo.
 * Si alguna ubicación es imprecisa devuelve null: mejor no mostrar nada que una distancia falsa.
 */
export function relacion(
  yo: (Punto & { precision: number | null }) | null,
  miRumbo: number | null,
  otro: UbicacionRemota | null | undefined,
): Relacion | null {
  if (!yo || !otro || ubicacionImprecisa(yo, otro)) return null;
  return {
    distancia: distancia(yo, otro),
    rumbo: rumbo(yo, otro),
    angulo: anguloFlecha(yo, otro, miRumbo),
    precision: Math.max(yo.precision ?? 0, otro.precision ?? 0),
  };
}
