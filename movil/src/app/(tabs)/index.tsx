import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EstadoConexion } from '@/components/EstadoConexion';
import { Logo } from '@/components/Logo';
import { TarjetaDispositivo } from '@/components/TarjetaDispositivo';
import { Boton, Encabezado, Pantalla } from '@/components/ui';
import { useAhora } from '@/hooks/useAhora';
import { useEncuentrame } from '@/store/useEncuentrame';
import { C, RADIO } from '@/theme';

export default function MiGrupo() {
  const router = useRouter();
  const ahora = useAhora(1000);
  const dispositivos = useEncuentrame((s) => s.dispositivos);
  const permiso = useEncuentrame((s) => s.permisoUbicacion);
  const lista = Object.values(dispositivos).sort((a, b) => Number(b.enLinea) - Number(a.enLinea) || a.nombre.localeCompare(b.nombre));

  return (
    <Pantalla conFondo={false}>
      <Encabezado titulo="Encuéntrame" derecha={<EstadoConexion />} />

      {permiso === 'denegado' ? (
        <View style={styles.aviso}>
          <Ionicons name="location-outline" size={18} color={C.rojo} />
          <Text style={styles.avisoTexto}>Activa el permiso de ubicación para ver la distancia y la dirección.</Text>
        </View>
      ) : null}

      {lista.length ? (
        <>
          {lista.map((d) => (
            <TarjetaDispositivo key={d.id} d={d} ahora={ahora} />
          ))}
          <Pressable onPress={() => router.push('/vincular')} style={({ pressed }) => [styles.agregar, pressed && { opacity: 0.6 }]}>
            <Ionicons name="add" size={18} color={C.muted} />
            <Text style={styles.agregarTexto}>Vincular otro reloj</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.vacio}>
          <Logo tamano={56} color={C.muted} />
          <Text style={styles.vacioTitulo}>Aún no hay relojes</Text>
          <Text style={styles.vacioTexto}>Vincula un reloj para ver hacia dónde está y a qué distancia.</Text>
          <Boton texto="Vincular un reloj" onPress={() => router.push('/vincular')} style={{ alignSelf: 'stretch', marginTop: 8 }} />
        </View>
      )}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  agregar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: RADIO.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.borderFuerte,
  },
  agregarTexto: { color: C.muted, fontSize: 14.5, fontWeight: '500' },
  vacio: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  vacioTitulo: { color: C.text, fontSize: 18, fontWeight: '600', marginTop: 12 },
  vacioTexto: { color: C.muted, fontSize: 14.5, lineHeight: 21, textAlign: 'center', maxWidth: 300 },
  aviso: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 4 },
  avisoTexto: { color: C.muted, fontSize: 13.5, lineHeight: 19, flex: 1 },
});
