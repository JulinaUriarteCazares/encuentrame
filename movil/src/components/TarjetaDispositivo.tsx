import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cardinal, textoDistancia } from '@/lib/geo';
import { haceCuanto, relacion, textoBateria } from '@/lib/formato';
import type { Par } from '@/lib/protocolo';
import { useEncuentrame } from '@/store/useEncuentrame';
import { C, colorCercania, RADIO } from '@/theme';

import { Avatar } from './Avatar';
import { MiniFlecha } from './MiniFlecha';

export function TarjetaDispositivo({ d, ahora }: { d: Par; ahora: number }) {
  const router = useRouter();
  const yo = useEncuentrame((s) => s.miUbicacion);
  const rumboYo = useEncuentrame((s) => s.miRumbo);
  const fuera = useEncuentrame((s) => !!s.fueraDeZona[d.id]);
  const zona = useEncuentrame((s) => s.prefs[d.id]?.zona ?? null);
  const color = d.color ?? C.cian;
  const rel = relacion(yo, rumboYo, d.ubicacion);
  const bateria = textoBateria(d.ubicacion?.bateria);

  const estado = d.enLinea
    ? [bateria ? `Batería ${bateria}` : null, d.ubicacion ? haceCuanto(d.ubicacion.ts, ahora) : 'sin ubicación'].filter(Boolean).join(' · ')
    : `Desconectado${d.ubicacion ? ` · ${haceCuanto(d.ubicacion.ts, ahora)}` : ''}`;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/buscar/[id]', params: { id: d.id } })}
      style={({ pressed }) => [styles.fila, pressed && { backgroundColor: C.card2 }]}>
      <Avatar nombre={d.nombre} color={color} tamano={46} enLinea={d.enLinea} alerta={fuera} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.nombre} numberOfLines={1}>
          {d.nombre}
        </Text>
        <Text style={styles.estado} numberOfLines={1}>
          {estado}
        </Text>
        {fuera ? <Text style={[styles.estado, { color: C.rojo }]}>Fuera de la zona de {zona} m</Text> : null}
      </View>
      <View style={styles.derecha}>
        <Text style={[styles.distancia, { color: rel ? colorCercania(rel.distancia, zona) : C.dim }]}>{rel ? textoDistancia(rel.distancia) : '—'}</Text>
        {rel ? <Text style={styles.direccion}>{cardinal(rel.rumbo, true)}</Text> : null}
      </View>
      <MiniFlecha angulo={rel ? rel.angulo : null} color={color} activa={d.enLinea} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.card,
    borderRadius: RADIO.lg,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  nombre: { color: C.text, fontSize: 16.5, fontWeight: '600' },
  estado: { color: C.muted, fontSize: 13 },
  derecha: { alignItems: 'flex-end', gap: 1 },
  distancia: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  direccion: { color: C.dim, fontSize: 12 },
});
