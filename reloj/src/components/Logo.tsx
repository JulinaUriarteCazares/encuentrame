import Svg, { Circle, Path } from 'react-native-svg';

import { C } from '@/theme';

/** Logo: pin de ubicación con una flecha, en línea fina y un solo color. */
export function Logo({ tamano = 40, color = C.text }: { tamano?: number; color?: string }) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 64 64">
      <Path
        d="M32 6 C21.5 6 13 14.5 13 25 C13 39 32 58 32 58 C32 58 51 39 51 25 C51 14.5 42.5 6 32 6 Z"
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <Circle cx={32} cy={25} r={11} fill="none" stroke={color} strokeWidth={2} opacity={0.4} />
      <Path d="M32 16 L38 32 L32 28.5 L26 32 Z" fill={color} transform="rotate(35 32 25)" />
    </Svg>
  );
}
