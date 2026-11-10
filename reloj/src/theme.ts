// Paleta sobria: grises neutros, un solo acento claro y colores de estado apagados.
export const C = {
  bg: '#0F1012',
  bg2: '#141518',
  card: '#18191C',
  card2: '#202124',
  border: '#26272B',
  borderFuerte: '#323338',
  text: '#EDEDEF',
  muted: '#9A9BA1',
  dim: '#66676D',
  /** Acento principal (botones primarios): casi blanco. */
  ambar: '#EDEDEF',
  ambarSuave: 'rgba(237,237,239,0.07)',
  cian: '#8FA9C2',
  cianSuave: 'rgba(143,169,194,0.12)',
  verde: '#7DB394',
  verdeSuave: 'rgba(125,179,148,0.12)',
  rojo: '#D96B6B',
  rojoSuave: 'rgba(217,107,107,0.12)',
  violeta: '#A59BC4',
} as const;

export const RADIO = { sm: 10, md: 12, lg: 16, xl: 20 } as const;

/** Colores de cada dispositivo: tonos apagados, nada chillón. */
export const COLORES_DISPOSITIVO = ['#C9A27E', '#8FA9C2', '#A59BC4', '#7DB394', '#C98F9B', '#C7B57A'];
/** Distancia máxima permitida entre teléfono y reloj (m). */
export const ZONA_MIN = 5;
export const ZONA_MAX = 100;
export const ZONA_PASO = 5;

/** "#RRGGBB" + alfa -> "rgba(...)" */
export function conAlfa(hex: string, alfa: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alfa})`;
}

/**
 * Qué tan cerca está, de 0 (sin señal) a 5 (aquí mismo).
 * Si hay una distancia máxima (zona), la escala se ajusta a ella: con 5 m, 30 m ya es "fuera".
 */
export function nivelCercania(m: number | null | undefined, zona?: number | null): number {
  if (m == null) return 0;
  const z = zona ?? 50;
  if (m <= Math.max(3, z * 0.25)) return 5;
  if (m <= z * 0.6) return 4;
  if (m <= z) return 3;
  if (m <= z * 3) return 2;
  return 1;
}

/** Color según qué tan cerca está: verde (aquí) → ámbar → cian (lejos) o rojo si pasó la zona. */
export function colorCercania(m: number | null | undefined, zona?: number | null): string {
  const n = nivelCercania(m, zona);
  if (n === 0) return C.dim;
  if (n === 5) return C.verde;
  if (n === 4) return '#B7E36A';
  if (n === 3) return C.ambar;
  return zona ? C.rojo : C.cian;
}

export function textoCercania(m: number | null | undefined, zona?: number | null): string {
  const n = nivelCercania(m, zona);
  if (n === 0) return 'Sin señal';
  if (n === 5) return '¡Aquí mismo!';
  if (n === 4) return 'Muy cerca';
  if (n === 3) return zona ? 'Cerca del límite' : 'Cerca';
  if (zona) return 'Fuera de la zona';
  return n === 2 ? 'Lejos' : 'Muy lejos';
}
