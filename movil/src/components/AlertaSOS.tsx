import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

import { useAhora } from '@/hooks/useAhora';
import { cardinal, textoDistancia } from '@/lib/geo';
import { haceCuanto, relacion } from '@/lib/formato';
import { useEncuentrame } from '@/store/useEncuentrame';
import { C } from '@/theme';

import { Avatar } from './Avatar';
import { Boton } from './ui';

/** Pantalla roja de emergencia cuando un reloj presiona SOS. */
export function AlertaSOS() {
  const router = useRouter();
  const sos = useEncuentrame((s) => s.sos);
  const d = useEncuentrame((s) => (s.sos ? s.dispositivos[s.sos.de] : undefined));
  const yo = useEncuentrame((s) => s.miUbicacion);
  const rumboYo = useEncuentrame((s) => s.miRumbo);
  const atender = useEncuentrame((s) => s.atenderSos);
  const ahora = useAhora(1000);
  const [pulso] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!sos) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulso, { toValue: 0, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [sos, pulso]);

  if (!sos) return null;
  const rel = relacion(yo, rumboYo, d?.ubicacion);

  return (
    <View style={[StyleSheet.absoluteFill, styles.fondo]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.rojo, opacity: pulso.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.12] }) }]} />
      <View style={styles.contenido}>
        <Text style={styles.sos}>EMERGENCIA</Text>
        <Avatar nombre={d?.nombre} color={d?.color} tamano={80} alerta />
        <Text style={styles.titulo}>{d?.nombre ?? 'Un dispositivo'} necesita ayuda</Text>
        <Text style={styles.texto}>
          Presionó el botón de emergencia {haceCuanto(sos.ts, ahora)}.
          {rel ? ` Está a ${textoDistancia(rel.distancia)} al ${cardinal(rel.rumbo)}.` : ''}
        </Text>
        <View style={{ gap: 10, alignSelf: 'stretch' }}>
          <Boton
            texto="Buscar ahora"
            icono="navigate"
            onPress={() => {
              atender();
              router.push({ pathname: '/buscar/[id]', params: { id: sos.de } });
            }}
          />
          <Boton texto="Entendido, voy para allá" variante="secundario" onPress={atender} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  contenido: { width: '100%', maxWidth: 420, alignItems: 'center', gap: 18 },
  sos: { color: C.rojo, fontSize: 15, fontWeight: '600', letterSpacing: 3 },
  titulo: { color: C.text, fontSize: 22, fontWeight: '600', textAlign: 'center' },
  texto: { color: C.muted, fontSize: 15, textAlign: 'center', lineHeight: 21 },
});
