import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { useAnguloSuave } from '@/hooks/useAnguloSuave';
import { C } from '@/theme';

const TICKS = Array.from({ length: 36 }, (_, i) => i * 10);
const LETRAS: [string, number][] = [
  ['N', 0],
  ['E', 90],
  ['S', 180],
  ['O', 270],
];

/**
 * Brújula con la flecha que apunta hacia el otro dispositivo.
 * El dial gira con la brújula del teléfono; la flecha gira hacia `angulo`.
 */
export function Brujula({
  angulo,
  rumboTelefono,
  color,
  activa,
  tamano = 300,
}: {
  angulo: number;
  rumboTelefono: number | null;
  color: string;
  activa: boolean;
  tamano?: number;
}) {
  const giroFlecha = useAnguloSuave(angulo);
  const giroDial = useAnguloSuave(-(rumboTelefono ?? 0));

  return (
    <View style={{ width: tamano, height: tamano }}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: giroDial }] }]}>
        <Svg width={tamano} height={tamano} viewBox="0 0 200 200">
          <Circle cx={100} cy={100} r={96} fill="none" stroke={C.border} strokeWidth={1} />
          {TICKS.map((a) => {
            const largo = a % 90 === 0 ? 7 : 3.5;
            const rad = (a * Math.PI) / 180;
            return (
              <Line
                key={a}
                x1={100 + Math.sin(rad) * 92}
                y1={100 - Math.cos(rad) * 92}
                x2={100 + Math.sin(rad) * (92 - largo)}
                y2={100 - Math.cos(rad) * (92 - largo)}
                stroke={a % 90 === 0 ? C.muted : C.borderFuerte}
                strokeWidth={a % 90 === 0 ? 1.4 : 1}
              />
            );
          })}
          {LETRAS.map(([l, a]) => {
            const rad = (a * Math.PI) / 180;
            return (
              <SvgText
                key={l}
                x={100 + Math.sin(rad) * 76}
                y={100 - Math.cos(rad) * 76 + 4}
                fill={l === 'N' ? C.text : C.dim}
                fontSize={11}
                fontWeight="500"
                textAnchor="middle">
                {l}
              </SvgText>
            );
          })}
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: giroFlecha }], opacity: activa ? 1 : 0.2 }]}>
        <Svg width={tamano} height={tamano} viewBox="0 0 200 200">
          <Path d="M100 42 L126 136 L100 120 L74 136 Z" fill={color} strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}
