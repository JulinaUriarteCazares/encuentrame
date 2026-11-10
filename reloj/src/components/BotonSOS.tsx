import { useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';

import { C } from '@/theme';

const DURACION = 2000;

/**
 * Botón SOS que hay que mantener presionado 2 s (para evitar enviarlo por accidente).
 * El envío lo decide un temporizador (no la animación), así funciona aunque la
 * pantalla no esté dibujando cuadros (pestaña en segundo plano, ahorro de batería…).
 */
export function BotonSOS({ tamano, onEnviar }: { tamano: number; onEnviar: () => void }) {
  const [progreso] = useState(() => new Animated.Value(0));
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nativo = Platform.OS !== 'web';

  const empezar = () => {
    if (nativo) Vibration.vibrate(30);
    progreso.setValue(0);
    Animated.timing(progreso, { toValue: 1, duration: DURACION, useNativeDriver: nativo }).start();
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      temporizador.current = null;
      if (nativo) Vibration.vibrate([0, 120, 80, 120]);
      onEnviar();
      progreso.setValue(0);
    }, DURACION);
  };

  const soltar = () => {
    if (temporizador.current) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
    progreso.stopAnimation();
    Animated.timing(progreso, { toValue: 0, duration: 200, useNativeDriver: nativo }).start();
  };

  const escala = progreso.interpolate({ inputRange: [0, 1], outputRange: [0.001, 1] });

  return (
    <Pressable onPressIn={empezar} onPressOut={soltar} accessibilityLabel="Botón SOS: mantener presionado" style={{ width: tamano, height: tamano }}>
      <View style={[styles.circulo, { width: tamano, height: tamano, borderRadius: tamano / 2 }]}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: tamano / 2, backgroundColor: '#FFD0D5', opacity: 0.45, transform: [{ scale: escala }] },
          ]}
        />
        <Text style={[styles.texto, { fontSize: tamano * 0.28 }]}>SOS</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circulo: {
    backgroundColor: C.rojo,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  texto: { color: '#fff', fontWeight: '900', letterSpacing: 2 },
});
