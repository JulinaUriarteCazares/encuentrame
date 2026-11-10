import { useEffect, useRef, useState } from 'react';
import { Animated, Platform } from 'react-native';

import { norm180 } from '@/lib/geo';

/**
 * Gira hacia un ángulo con un resorte, siempre por el camino más corto
 * (de 350° a 10° gira 20°, no 340°). Devuelve un valor listo para `rotate`.
 */
export function useAnguloSuave(objetivo: number) {
  const [valor] = useState(() => new Animated.Value(objetivo));
  const acumulado = useRef(objetivo);

  useEffect(() => {
    acumulado.current += norm180(objetivo - acumulado.current);
    Animated.spring(valor, {
      toValue: acumulado.current,
      useNativeDriver: Platform.OS !== 'web',
      damping: 16,
      stiffness: 110,
      mass: 0.7,
    }).start();
  }, [objetivo, valor]);

  return valor.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'], extrapolate: 'extend' });
}
