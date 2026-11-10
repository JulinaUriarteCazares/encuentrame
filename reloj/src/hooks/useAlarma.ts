import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { Platform, Vibration } from 'react-native';

import { useReloj } from '@/store/useReloj';

const SONIDO_ALARMA = require('../../assets/sonidos/alarma.wav');
const SONIDO_AVISO = require('../../assets/sonidos/aviso.wav');

let reproductorAviso: AudioPlayer | null = null;
function sonarAviso() {
  try {
    reproductorAviso ??= createAudioPlayer(SONIDO_AVISO);
    reproductorAviso.seekTo(0).catch(() => undefined);
    reproductorAviso.play();
  } catch {
    // el navegador puede bloquear el audio hasta que se haga clic en la página
  }
}

/** Sonido y vibración del reloj: alarma en bucle para "hacer sonar" y un aviso corto para lo demás. */
export function useAlarma() {
  const sonando = useReloj((s) => s.sonando);
  const sonido = useReloj((s) => s.sonidoActivo);
  // Marca de tiempo del último evento que merece aviso (cambia cuando llega uno nuevo).
  const ultimoEvento = useReloj((s) =>
    Math.max(
      s.zona?.fuera ? s.zona.ts : 0,
      s.encontrado?.ts ?? 0,
      s.vinculadoReciente?.ts ?? 0,
      s.sos?.estado === 'confirmado' ? s.sos.ts + 1 : 0,
    ),
  );
  const anterior = useRef(ultimoEvento);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!sonando) return;
    let alarma: AudioPlayer | null = null;
    if (sonido) {
      try {
        alarma = createAudioPlayer(SONIDO_ALARMA);
        alarma.loop = true;
        alarma.volume = 1;
        alarma.play();
      } catch {
        alarma = null;
      }
    }
    if (Platform.OS !== 'web') Vibration.vibrate([0, 600, 300], true);
    // Se apaga solo para no gastar batería si nadie lo detiene.
    const corte = setTimeout(() => useReloj.getState().detenerSonido(), 45000);
    return () => {
      clearTimeout(corte);
      try {
        alarma?.pause();
        alarma?.remove();
      } catch {
        // ya estaba liberado
      }
      Vibration.cancel();
    };
  }, [sonando, sonido]);

  useEffect(() => {
    if (ultimoEvento <= anterior.current) return;
    anterior.current = ultimoEvento;
    if (sonido) sonarAviso();
    if (Platform.OS !== 'web') Vibration.vibrate([0, 250, 120, 250]);
  }, [ultimoEvento, sonido]);
}

/** Desbloquea el audio en el navegador (debe llamarse desde un clic). */
export function probarSonido() {
  sonarAviso();
}
