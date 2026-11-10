import Ionicons from '@expo/vector-icons/Ionicons';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, Vibration, View } from 'react-native';

import { useEncuentrame } from '@/store/useEncuentrame';
import { C } from '@/theme';

import { Boton } from './ui';

const ALARMA = require('../../assets/sonidos/alarma.wav');

/** Pantalla completa mientras un reloj hace sonar este teléfono. */
export function AlertaSonando() {
  const router = useRouter();
  const quien = useEncuentrame((s) => s.sonandoPor);
  const d = useEncuentrame((s) => (s.sonandoPor ? s.dispositivos[s.sonandoPor] : undefined));
  const detener = useEncuentrame((s) => s.detenerAlarma);

  useEffect(() => {
    if (!quien) return;
    let alarma: AudioPlayer | null = null;
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    try {
      alarma = createAudioPlayer(ALARMA);
      alarma.loop = true;
      alarma.volume = 1;
      alarma.play();
    } catch {
      alarma = null;
    }
    if (Platform.OS !== 'web') Vibration.vibrate([0, 600, 300], true);
    // Se apaga sola a los 45 s.
    const corte = setTimeout(() => useEncuentrame.getState().detenerAlarma(), 45000);
    return () => {
      clearTimeout(corte);
      try {
        alarma?.pause();
        alarma?.remove();
      } catch {
        // ya liberado
      }
      Vibration.cancel();
    };
  }, [quien]);

  if (!quien) return null;
  const nombre = d?.nombre ?? 'El reloj';

  return (
    <View style={[StyleSheet.absoluteFill, styles.fondo]}>
      <View style={styles.contenido}>
        <View style={styles.icono}>
          <Ionicons name="volume-high-outline" size={34} color={C.text} />
        </View>
        <Text style={styles.titulo}>{nombre} está buscando tu teléfono</Text>
        <Text style={styles.texto}>Tu teléfono está sonando para que lo encuentres.</Text>
        <View style={{ gap: 10, alignSelf: 'stretch', marginTop: 12 }}>
          <Boton texto="Ya lo encontré" onPress={detener} />
          <Boton
            texto={`Ver dónde está ${nombre}`}
            variante="secundario"
            onPress={() => {
              detener();
              router.push({ pathname: '/buscar/[id]', params: { id: quien } });
            }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  contenido: { width: '100%', maxWidth: 400, alignItems: 'center', gap: 10 },
  icono: { width: 76, height: 76, borderRadius: 38, borderWidth: 1, borderColor: C.borderFuerte, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  titulo: { color: C.text, fontSize: 22, fontWeight: '600', textAlign: 'center' },
  texto: { color: C.muted, fontSize: 15, textAlign: 'center' },
});
