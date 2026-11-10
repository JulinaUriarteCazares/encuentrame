import { useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { C, RADIO } from '@/theme';

/** Seis casillas para el código de vinculación (un solo TextInput invisible detrás). */
export function CodigoInput({ valor, onCambio }: { valor: string; onCambio: (v: string) => void }) {
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  return (
    <Pressable onPress={() => ref.current?.focus()} style={styles.fila} accessibilityLabel="Código de 6 dígitos">
      {Array.from({ length: 6 }, (_, i) => {
        const activa = i === valor.length;
        return (
          <View key={i} style={[styles.casilla, valor[i] ? styles.llena : null, activa && styles.activa]}>
            <Text style={styles.digito}>{valor[i] ?? ''}</Text>
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={valor}
        onChangeText={(t) => onCambio(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        style={styles.oculto}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  casilla: {
    width: 46,
    height: 58,
    borderRadius: RADIO.sm,
    backgroundColor: C.card2,
    borderWidth: 1.5,
    borderColor: C.borderFuerte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  llena: { borderColor: C.muted },
  activa: { borderColor: C.text },
  digito: { color: C.text, fontSize: 26, fontWeight: '600' },
  oculto: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
