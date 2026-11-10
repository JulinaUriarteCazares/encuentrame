// ⚠️ Archivo compartido: debe ser IGUAL en movil/src/lib y reloj/src/lib.
// Cálculos geográficos para la flecha: distancia y dirección entre dos puntos GPS.

export interface Punto {
  lat: number;
  lon: number;
}

const R = 6371000; // radio de la Tierra en metros
const rad = (g: number) => (g * Math.PI) / 180;
const grados = (r: number) => (r * 180) / Math.PI;

/** Normaliza un ángulo a [0, 360). */
export function norm360(a: number): number {
  return ((a % 360) + 360) % 360;
}

/** Normaliza un ángulo a (-180, 180]. */
export function norm180(a: number): number {
  const n = norm360(a);
  return n > 180 ? n - 360 : n;
}

/** Distancia en metros (fórmula de haversine). */
export function distancia(a: Punto, b: Punto): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rumbo inicial de A hacia B en grados (0 = norte, 90 = este). */
export function rumbo(a: Punto, b: Punto): number {
  const φ1 = rad(a.lat);
  const φ2 = rad(b.lat);
  const Δλ = rad(b.lon - a.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return norm360(grados(Math.atan2(y, x)));
}

/**
 * Ángulo al que debe girar la flecha en pantalla.
 * Si hay brújula, es relativo a hacia dónde apunta el teléfono; si no, relativo al norte.
 */
export function anguloFlecha(desde: Punto, hacia: Punto, orientacion: number | null): number {
  return norm360(rumbo(desde, hacia) - (orientacion ?? 0));
}

/** Mueve un punto cierta cantidad de metros al este y al norte. */
export function desplazar(p: Punto, este: number, norte: number): Punto {
  return {
    lat: p.lat + grados(norte / R),
    lon: p.lon + grados(este / (R * Math.cos(rad(p.lat)))),
  };
}

/** Diferencia entre dos puntos en metros {este, norte} (aproximación plana, válida a corta distancia). */
export function diferencia(desde: Punto, hacia: Punto): { este: number; norte: number } {
  return {
    norte: rad(hacia.lat - desde.lat) * R,
    este: rad(hacia.lon - desde.lon) * R * Math.cos(rad(desde.lat)),
  };
}

const CARDINALES = ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'];
const CARDINALES_CORTOS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

export function cardinal(g: number, corto = false): string {
  const i = Math.round(norm360(g) / 45) % 8;
  return (corto ? CARDINALES_CORTOS : CARDINALES)[i];
}

export function textoDistancia(m: number): string {
  if (!Number.isFinite(m)) return '—';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}
