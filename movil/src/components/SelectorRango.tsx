import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View, type GestureResponderEvent } from 'react-native';

import { C, ZONA_MAX, ZONA_MIN, ZONA_PASO } from '@/theme';

const ATAJOS = [5, 10, 25, 50, 100];
const limitar = (v: number) => Math.min(ZONA_MAX, Math.max(ZONA_MIN, Math.round(v / ZONA_PASO) * ZONA_PASO));

/**
 * Distancia máxima permitida entre el teléfono y el reloj (5–100 m).
 * Se arrastra la barra, se usan − / + o los atajos. Apagado = sin límite.
 */
export function SelectorRango({ valor, onCambio, color = C.text }: { valor: number | null; onCambio: (v: number | null) => void; color?: string }) {
  const [ancho, setAncho] = useState(0);
  const activo = valor != null;
  const v = valor ?? 20;
  const pos = (v - ZONA_MIN) / (ZONA_MAX - ZONA_MIN);

  const arrastrar = (e: GestureResponderEvent) => {
    if (!ancho) return;
    const x = Math.min(ancho, Math.max(0, e.nativeEvent.locationX));
    onCambio(limitar(ZONA_MIN + (x / ancho) * (ZONA_MAX - ZONA_MIN)));
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.fila}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>Avisar si se alejan</Text>
          <Text style={styles.ayuda}>El móvil y el reloj vibran si pasan esta distancia.</Text>
        </View>
        <Switch
          value={activo}
          onValueChange={(on) => onCambio(on ? v : null)}
          trackColor={{ false: C.borderFuerte, true: C.verde }}
          thumbColor={C.text}
          accessibilityLabel="Activar distancia máxima"
        />
      </View>

      {activo ? (
        <>
          <View style={styles.valorFila}>
            <Pressable onPress={() => onCambio(limitar(v - ZONA_PASO))} style={styles.paso} accessibilityLabel="Menos distancia" hitSlop={6}>
              <Ionicons name="remove" size={22} color={C.text} />
            </Pressable>
            <View style={{ alignItems: 'center', minWidth: 120 }}>
              <Text style={[styles.valor, { color }]}>{v} m</Text>
              <Text style={styles.ayuda}>distancia máxima</Text>
            </View>
            <Pressable onPress={() => onCambio(limitar(v + ZONA_PASO))} style={styles.paso} accessibilityLabel="Más distancia" hitSlop={6}>
              <Ionicons name="add" size={22} color={C.text} />
            </Pressable>
          </View>

          {/* Barra deslizable */}
          <View style={styles.barra} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
            <View style={[styles.pista]} />
            <View style={[styles.relleno, { width: `${pos * 100}%`, backgroundColor: color }]} />
            <View style={[styles.perilla, { left: `${pos * 100}%`, borderColor: color }]} />
            <View
              style={StyleSheet.absoluteFill}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderTerminationRequest={() => false}
              onResponderGrant={arrastrar}
              onResponderMove={arrastrar}
              accessibilityLabel="Barra de distancia"
            />
          </View>
          <View style={styles.extremos}>
            <Text style={styles.ayuda}>{ZONA_MIN} m</Text>
            <Text style={styles.ayuda}>{ZONA_MAX} m</Text>
          </View>

          <View style={styles.atajos}>
            {ATAJOS.map((a) => (
              <Pressable
                key={a}
                onPress={() => onCambio(a)}
                style={[styles.atajo, a === v && { backgroundColor: color, borderColor: color }]}
                accessibilityLabel={`${a} metros`}>
                <Text style={[styles.atajoTexto, a === v && { color: C.bg }]}>{a} m</Text>
              </Pressable>
            ))}
          </View>
          {v <= 10 ? (
            <Text style={styles.ayuda}>
              Con {v} m el GPS puede variar unos metros: calibra juntos antes de usarlo y la alerta espera 3 s para confirmar.
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const PERILLA = 26;
const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titulo: { color: C.text, fontSize: 15, fontWeight: '500' },
  ayuda: { color: C.dim, fontSize: 12.5, lineHeight: 17 },
  valorFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  paso: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: C.borderFuerte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valor: { fontSize: 34, fontWeight: '600', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  barra: { height: 36, justifyContent: 'center', marginHorizontal: PERILLA / 2 },
  pista: { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, backgroundColor: C.borderFuerte },
  relleno: { position: 'absolute', left: 0, height: 4, borderRadius: 2 },
  perilla: {
    position: 'absolute',
    width: PERILLA,
    height: PERILLA,
    marginLeft: -PERILLA / 2,
    borderRadius: PERILLA / 2,
    backgroundColor: C.text,
    borderWidth: 0,
  },
  extremos: { flexDirection: 'row', justifyContent: 'space-between' },
  atajos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  atajo: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: C.borderFuerte },
  atajoTexto: { color: C.text, fontSize: 13, fontWeight: '500' },
});
