import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useEncuentrame, type TipoAviso } from '@/store/useEncuentrame';
import { C } from '@/theme';

import type { NombreIcono } from './ui';

const ESTILO: Record<TipoAviso, { color: string; icono: NombreIcono }> = {
  info: { color: C.cian, icono: 'information-circle-outline' },
  exito: { color: C.verde, icono: 'checkmark-circle-outline' },
  alerta: { color: C.rojo, icono: 'alert-circle-outline' },
};

/**
 * Avisos de la app. No flotan encima de nada: ocupan su propio espacio arriba
 * de la pantalla (el layout raíz los coloca antes del contenido).
 */
export function Avisos({ margenSuperior }: { margenSuperior: number }) {
  const avisos = useEncuentrame((s) => s.avisos);
  const cerrar = useEncuentrame((s) => s.cerrarAviso);
  if (!avisos.length) return null;
  return (
    <View style={[styles.contenedor, { paddingTop: margenSuperior + 6 }]}>
      {avisos.map((a) => {
        const e = ESTILO[a.tipo];
        return (
          <Pressable key={a.id} onPress={() => cerrar(a.id)} style={({ pressed }) => [styles.aviso, pressed && { opacity: 0.7 }]}>
            <Ionicons name={e.icono} size={20} color={e.color} />
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo}>{a.titulo}</Text>
              {a.texto ? <Text style={styles.texto}>{a.texto}</Text> : null}
            </View>
            <Ionicons name="close" size={16} color={C.dim} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { backgroundColor: C.bg2, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 16, paddingBottom: 8, gap: 6 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, width: '100%', maxWidth: 560, alignSelf: 'center' },
  titulo: { color: C.text, fontSize: 14, fontWeight: '500' },
  texto: { color: C.muted, fontSize: 13, marginTop: 1 },
});
