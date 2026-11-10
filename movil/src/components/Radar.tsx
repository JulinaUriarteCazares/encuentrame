import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { textoDistancia } from '@/lib/geo';
import { C, conAlfa } from '@/theme';

export interface PuntoRadar {
  id: string;
  color: string;
  nombre: string;
  distancia: number;
  /** Ángulo en pantalla (0 = arriba). */
  angulo: number;
  enLinea: boolean;
  alerta?: boolean;
}

const ESCALAS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 20000];

/** Vista de todos los dispositivos alrededor tuyo (tú al centro). */
export function Radar({
  puntos,
  tamano,
  rumboTelefono,
  onPress,
}: {
  puntos: PuntoRadar[];
  tamano: number;
  rumboTelefono: number | null;
  onPress?: (id: string) => void;
}) {
  const maxDist = Math.max(0, ...puntos.map((p) => p.distancia));
  const escala = ESCALAS.find((e) => e >= maxDist * 1.1) ?? ESCALAS[ESCALAS.length - 1];
  const r = tamano / 2;
  const radioUtil = r - 22;
  const norte = -(rumboTelefono ?? 0);

  return (
    <View style={{ width: tamano, height: tamano }}>
      <Svg width={tamano} height={tamano}>
        <Circle cx={r} cy={r} r={r - 2} fill="none" stroke={C.border} strokeWidth={1} />
        {[0.33, 0.66].map((k) => (
          <Circle key={k} cx={r} cy={r} r={radioUtil * k} fill="none" stroke={C.border} strokeWidth={1} strokeDasharray="2 5" />
        ))}
        <Line x1={r} y1={8} x2={r} y2={tamano - 8} stroke={C.border} strokeWidth={0.6} />
        <Line x1={8} y1={r} x2={tamano - 8} y2={r} stroke={C.border} strokeWidth={0.6} />
        {[0.66, 1].map((k) => (
          <SvgText key={k} x={r + radioUtil * k - 2} y={r - 5} fill={C.dim} fontSize={10} textAnchor="end">
            {textoDistancia(escala * k)}
          </SvgText>
        ))}
        <SvgText
          x={r + Math.sin((norte * Math.PI) / 180) * (r - 12)}
          y={r - Math.cos((norte * Math.PI) / 180) * (r - 12) + 4}
          fill={C.muted}
          fontSize={11}
          fontWeight="500"
          textAnchor="middle">
          N
        </SvgText>
      </Svg>

      {/* Tú */}
      <View pointerEvents="none" style={[styles.yo, { left: r - 5, top: r - 5 }]} />

      {puntos.map((p) => {
        const k = Math.min(1, p.distancia / escala);
        const rad = (p.angulo * Math.PI) / 180;
        const x = r + Math.sin(rad) * radioUtil * k;
        const y = r - Math.cos(rad) * radioUtil * k;
        return (
          <Pressable
            key={p.id}
            onPress={onPress ? () => onPress(p.id) : undefined}
            style={[styles.punto, { left: x - 30, top: y - 14, opacity: p.enLinea ? 1 : 0.4 }]}>
            <View style={[styles.marca, { backgroundColor: conAlfa(p.color, 0.18), borderColor: p.alerta ? C.rojo : p.color }]}>
              <Text style={[styles.inicial, { color: p.color }]}>{(p.nombre[0] ?? '?').toUpperCase()}</Text>
            </View>
            <Text style={styles.distancia} numberOfLines={1}>
              {textoDistancia(p.distancia)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  yo: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: C.text },
  punto: { position: 'absolute', width: 60, alignItems: 'center' },
  marca: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  inicial: { fontSize: 13, fontWeight: '600' },
  distancia: { color: C.muted, fontSize: 10.5, marginTop: 3, fontVariant: ['tabular-nums'] },
});
