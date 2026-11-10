import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

import { useAnguloSuave } from '@/hooks/useAnguloSuave';
import { C } from '@/theme';

/** Flecha del reloj: siempre apunta hacia el teléfono. La N del aro marca el norte. */
export function FlechaReloj({
  angulo,
  rumbo,
  color,
  activa,
  tamano,
}: {
  angulo: number;
  rumbo: number;
  color: string;
  activa: boolean;
  tamano: number;
}) {
  const giro = useAnguloSuave(angulo);
  const giroNorte = useAnguloSuave(-rumbo);

  return (
    <View style={{ width: tamano, height: tamano }}>
      <Svg width={tamano} height={tamano} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Circle cx={50} cy={50} r={46} fill="none" stroke="#2A2B2F" strokeWidth={1} />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: giroNorte }] }]}>
        <Svg width={tamano} height={tamano} viewBox="0 0 100 100">
          <SvgText x={50} y={11} fill={C.muted} fontSize={8} fontWeight="500" textAnchor="middle">
            N
          </SvgText>
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: giro }], opacity: activa ? 1 : 0.2 }]}>
        <Svg width={tamano} height={tamano} viewBox="0 0 100 100">
          <Path d="M50 18 L64 70 L50 61 L36 70 Z" fill={color} />
        </Svg>
      </Animated.View>
    </View>
  );
}
