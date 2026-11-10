import { Animated, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useAnguloSuave } from '@/hooks/useAnguloSuave';
import { C } from '@/theme';

/** Flechita para la lista: apunta hacia el dispositivo. */
export function MiniFlecha({ angulo, color, tamano = 34, activa = true }: { angulo: number | null; color: string; tamano?: number; activa?: boolean }) {
  const giro = useAnguloSuave(angulo ?? 0);
  return (
    <View style={{ width: tamano, height: tamano, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ transform: [{ rotate: giro }], opacity: angulo == null || !activa ? 0.25 : 1 }}>
        <Svg width={tamano * 0.7} height={tamano * 0.7} viewBox="0 0 24 24">
          <Path d="M12 2 L19.5 20 L12 15.8 L4.5 20 Z" fill={angulo == null ? C.dim : color} />
        </Svg>
      </Animated.View>
    </View>
  );
}
