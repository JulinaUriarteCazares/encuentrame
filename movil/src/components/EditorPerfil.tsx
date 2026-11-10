import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PerfilNuevo } from '@/store/useEncuentrame';
import { C, COLORES_DISPOSITIVO } from '@/theme';

import { Avatar } from './Avatar';
import { SelectorRango } from './SelectorRango';
import { Campo } from './ui';

/** Nombre, color y distancia máxima de un reloj. */
export function EditorPerfil({ perfil, onCambio }: { perfil: PerfilNuevo; onCambio: (p: PerfilNuevo) => void }) {
  const cambiar = (c: Partial<PerfilNuevo>) => onCambio({ ...perfil, ...c });
  return (
    <View style={{ gap: 22 }}>
      <View style={{ alignItems: 'center' }}>
        <Avatar nombre={perfil.nombre || '?'} color={perfil.color} tamano={72} />
      </View>

      <Campo
        etiqueta="Nombre"
        value={perfil.nombre}
        onChangeText={(nombre) => cambiar({ nombre })}
        placeholder="Ej. Sofía"
        maxLength={20}
      />

      <View style={{ gap: 10 }}>
        <Text style={styles.etiqueta}>Color</Text>
        <View style={styles.colores}>
          {COLORES_DISPOSITIVO.map((c) => (
            <Pressable
              key={c}
              onPress={() => cambiar({ color: c })}
              accessibilityLabel={`Color ${c}`}
              style={[styles.color, { backgroundColor: c }, perfil.color === c && styles.colorActivo]}
            />
          ))}
        </View>
      </View>

      <View style={styles.separador} />
      <SelectorRango valor={perfil.zona} onCambio={(zona) => cambiar({ zona })} />
    </View>
  );
}

const styles = StyleSheet.create({
  etiqueta: { color: C.muted, fontSize: 13, fontWeight: '500' },
  colores: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  color: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  colorActivo: { borderColor: C.text },
  separador: { height: 1, backgroundColor: C.border },
});
