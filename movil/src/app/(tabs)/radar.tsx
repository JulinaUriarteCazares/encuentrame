import { useRouter } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Radar, type PuntoRadar } from '@/components/Radar';
import { Encabezado, Pantalla } from '@/components/ui';
import { relacion } from '@/lib/formato';
import { useEncuentrame } from '@/store/useEncuentrame';
import { C } from '@/theme';

export default function PantallaRadar() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const dispositivos = useEncuentrame((s) => s.dispositivos);
  const fuera = useEncuentrame((s) => s.fueraDeZona);
  const yo = useEncuentrame((s) => s.miUbicacion);
  const rumboYo = useEncuentrame((s) => s.miRumbo);

  const puntos: PuntoRadar[] = Object.values(dispositivos).flatMap((d) => {
    const rel = relacion(yo, rumboYo, d.ubicacion);
    return rel
      ? [{ id: d.id, color: d.color ?? C.cian, nombre: d.nombre, distancia: rel.distancia, angulo: rel.angulo, enLinea: d.enLinea, alerta: fuera[d.id] }]
      : [];
  });
  const tamano = Math.min(width - 32, 420);

  return (
    <Pantalla conFondo={false}>
      <Encabezado titulo="Radar" />
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <Radar puntos={puntos} tamano={tamano} rumboTelefono={rumboYo} onPress={(id) => router.push({ pathname: '/buscar/[id]', params: { id } })} />
      </View>
      <Text style={styles.nota}>
        {!yo ? 'Esperando tu ubicación…' : rumboYo != null ? 'Tú estás al centro. Arriba es hacia donde apuntas.' : 'Tú estás al centro. Arriba es el norte.'}
      </Text>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  nota: { color: C.dim, fontSize: 13, textAlign: 'center' },
});
