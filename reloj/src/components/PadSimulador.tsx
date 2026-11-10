import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { diferencia } from '@/lib/geo';
import { guardianActivo, useReloj } from '@/store/useReloj';
import { C, conAlfa } from '@/theme';

/** Metros que cubre el mapa desde el centro hacia cada lado. */
export const RANGO_PAD = 80;
const CUADRICULA = 20;

const limitar = (n: number) => Math.max(-RANGO_PAD, Math.min(RANGO_PAD, n));

/**
 * Mapa del emulador: el centro es el punto de partida.
 * Muestra al teléfono (guardián) y al reloj; clic o arrastre mueve el reloj.
 */
export function PadSimulador({ tamano }: { tamano: number }) {
  const offset = useReloj((s) => s.offset);
  const ancla = useReloj((s) => s.ancla);
  const yo = useReloj((s) => s.yo);
  const g = useReloj(guardianActivo);
  const setOffset = useReloj((s) => s.setOffset);
  const setPaseo = useReloj((s) => s.setPaseo);

  const c = tamano / 2;
  const escala = c / RANGO_PAD; // px por metro
  const color = yo?.color ?? C.cian;

  const nino = { x: c + limitar(offset.este) * escala, y: c - limitar(offset.norte) * escala };
  const rel = g?.ubicacion && ancla ? diferencia(ancla, g.ubicacion) : null;
  const guardian = rel ? { x: c + limitar(rel.este) * escala, y: c - limitar(rel.norte) * escala } : null;
  const guardianFuera = !!rel && (Math.abs(rel.este) > RANGO_PAD || Math.abs(rel.norte) > RANGO_PAD);

  const mover = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    setPaseo(false);
    setOffset({
      este: Math.round(limitar((locationX - c) / escala)),
      norte: Math.round(limitar((c - locationY) / escala)),
    });
  };

  const lineas = [];
  for (let m = -RANGO_PAD; m <= RANGO_PAD; m += CUADRICULA) lineas.push(m);

  return (
    <View style={[styles.pad, { width: tamano, height: tamano }]}>
      <Svg width={tamano} height={tamano}>
        {lineas.map((m) => (
          <Line key={`v${m}`} x1={c + m * escala} y1={0} x2={c + m * escala} y2={tamano} stroke={m === 0 ? '#2A3856' : '#172238'} strokeWidth={1} />
        ))}
        {lineas.map((m) => (
          <Line key={`h${m}`} x1={0} y1={c + m * escala} x2={tamano} y2={c + m * escala} stroke={m === 0 ? '#2A3856' : '#172238'} strokeWidth={1} />
        ))}
        <Circle cx={c} cy={c} r={4} fill="none" stroke={C.dim} strokeWidth={1.5} />
        {guardian ? (
          <Line x1={guardian.x} y1={guardian.y} x2={nino.x} y2={nino.y} stroke={conAlfa(color, 0.7)} strokeWidth={2} strokeDasharray="5 5" />
        ) : null}
        <SvgText x={c} y={14} fill={C.rojo} fontSize={11} fontWeight="bold" textAnchor="middle">
          N
        </SvgText>
        {/* Escala */}
        <Line x1={10} y1={tamano - 12} x2={10 + CUADRICULA * escala} y2={tamano - 12} stroke={C.muted} strokeWidth={2} />
        <SvgText x={10} y={tamano - 18} fill={C.muted} fontSize={10}>
          {CUADRICULA} m
        </SvgText>
      </Svg>

      {guardian ? (
        <View pointerEvents="none" style={[styles.marcador, { left: guardian.x - 16, top: guardian.y - 16, backgroundColor: C.ambarSuave, borderColor: C.ambar, opacity: guardianFuera ? 0.6 : 1 }]}>
          <Text style={{ fontSize: 16 }}>📱</Text>
        </View>
      ) : null}
      <View pointerEvents="none" style={[styles.halo, { left: nino.x - 22, top: nino.y - 22, backgroundColor: conAlfa(color, 0.18) }]} />
      <View pointerEvents="none" style={[styles.marcador, { left: nino.x - 16, top: nino.y - 16, backgroundColor: conAlfa(color, 0.3), borderColor: color }]}>
        <Text style={{ fontSize: 16 }}>{yo?.emoji ?? '⌚'}</Text>
      </View>

      {/* Capa que recibe clics y arrastres (así locationX/Y son relativos al mapa) */}
      <View
        style={StyleSheet.absoluteFill}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={mover}
        onResponderMove={mover}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#0A1322', borderWidth: 1, borderColor: '#22304A', alignSelf: 'center' },
  marcador: { position: 'absolute', width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 44, height: 44, borderRadius: 22 },
});
