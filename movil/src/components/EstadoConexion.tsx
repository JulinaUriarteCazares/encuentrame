import { StyleSheet, Text } from 'react-native';

import { useEncuentrame } from '@/store/useEncuentrame';
import { C } from '@/theme';

/** Solo aparece cuando hay un problema de conexión (si todo va bien, no muestra nada). */
export function EstadoConexion() {
  const estado = useEncuentrame((s) => s.conexion);
  if (estado === 'conectado') return null;
  const texto = estado === 'conectando' ? 'Conectando…' : estado === 'duplicado' ? 'Abierto en otro lugar' : 'Sin conexión';
  return <Text style={[styles.texto, estado === 'desconectado' && { color: C.rojo }]}>{texto}</Text>;
}

const styles = StyleSheet.create({
  texto: { color: C.muted, fontSize: 13 },
});
