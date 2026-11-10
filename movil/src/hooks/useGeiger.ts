import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Vibración tipo "frío o caliente": mientras más cerca, más rápido y fuerte vibra.
 * Así se puede buscar sin mirar la pantalla todo el tiempo.
 */
export function useGeiger(distancia: number | null, activo: boolean) {
  const ref = useRef(distancia ?? 9999);
  const hayDistancia = distancia != null;

  useEffect(() => {
    ref.current = distancia ?? 9999;
  }, [distancia]);

  useEffect(() => {
    if (!activo || !hayDistancia || Platform.OS === 'web') return;
    let vivo = true;
    let t: ReturnType<typeof setTimeout>;
    const pulso = () => {
      if (!vivo) return;
      const d = ref.current;
      const estilo =
        d <= 10 ? Haptics.ImpactFeedbackStyle.Heavy : d <= 40 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light;
      Haptics.impactAsync(estilo).catch(() => undefined);
      t = setTimeout(pulso, Math.min(1800, Math.max(220, d * 12)));
    };
    pulso();
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [activo, hayDistancia]);
}
