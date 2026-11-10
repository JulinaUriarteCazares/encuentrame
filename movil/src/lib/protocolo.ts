// ⚠️ Archivo compartido: debe ser IGUAL en movil/src/lib y reloj/src/lib.
// Describe los mensajes que viajan por el servidor (Encuentrame/servidor/servidor.js).

export type Rol = 'movil' | 'reloj';

export interface Perfil {
  id: string;
  rol: Rol;
  nombre: string;
  emoji?: string;
  color?: string;
}

export interface UbicacionRemota {
  lat: number;
  lon: number;
  /** Precisión del GPS en metros. */
  precision: number | null;
  /** Hacia dónde apunta el dispositivo (0 = norte), si tiene brújula. */
  rumbo: number | null;
  /** Batería de 0 a 1. */
  bateria: number | null;
  ts: number;
}

export interface Par extends Perfil {
  enLinea: boolean;
  ubicacion: UbicacionRemota | null;
}

export interface DatosComando {
  /** Hacer sonar al otro dispositivo (funciona en los dos sentidos). */
  sonar: null;
  detenerSonido: null;
  zona: { fuera: boolean; metros: number; limite: number };
  encontrado: null;
  sosRecibido: null;
  /**
   * El teléfono, junto al reloj, le manda su posición promediada para corregir el GPS del reloj
   * y hacia dónde mira (su brújula), para orientar la flecha de un reloj que no tiene brújula (la PC).
   */
  calibrar: { lat: number; lon: number; precision: number | null; rumbo: number | null };
  /** Respuesta del reloj: cómo se corrigió, cuántos metros de diferencia había y si tomó la orientación. */
  calibrado: { modo: 'fija' | 'correccion'; diferencia: number; orientado: boolean };
}

export type Accion = keyof DatosComando;

export type MensajeCliente =
  | { t: 'hola'; id: string; rol: Rol; nombre?: string }
  | { t: 'pedirCodigo' }
  | { t: 'vincular'; codigo: string; nombre: string; emoji: string; color: string }
  | { t: 'perfil'; para?: string; nombre?: string; emoji?: string; color?: string }
  | { t: 'ubicacion'; lat: number; lon: number; precision: number | null; rumbo: number | null; bateria: number | null }
  | { t: 'comando'; para: string; accion: Accion; datos?: DatosComando[Accion] }
  | { t: 'sos' }
  | { t: 'desvincular'; con: string }
  | { t: 'ping' };

export type MensajeComando = {
  [A in Accion]: { t: 'comando'; de: string; accion: A; datos: DatosComando[A]; ts: number };
}[Accion];

export type MensajeServidor =
  | { t: 'bienvenida'; yo: Perfil; pares: Par[] }
  | { t: 'codigo'; codigo: string; expira: number }
  | { t: 'vinculado'; par: Par; yo?: Perfil }
  | { t: 'perfil'; perfil: Perfil }
  | { t: 'presencia'; id: string; enLinea: boolean }
  | ({ t: 'ubicacion'; de: string } & UbicacionRemota)
  | MensajeComando
  | { t: 'sos'; de: string; ts: number; ubicacion: UbicacionRemota | null }
  | { t: 'desvinculado'; con: string }
  | { t: 'error'; contexto?: string; mensaje: string }
  | { t: 'pong' };
