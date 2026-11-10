import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Brujula } from '@/components/Brujula';
import { CalibrarModal } from '@/components/CalibrarModal';
import { Boton, BotonIcono } from '@/components/ui';
import { useAhora } from '@/hooks/useAhora';
import { useGeiger } from '@/hooks/useGeiger';
import { haceCuanto, relacion, textoBateria, ubicacionImprecisa } from '@/lib/formato';
import { cardinal, textoDistancia } from '@/lib/geo';
import { useEncuentrame } from '@/store/useEncuentrame';
import { C, colorCercania, textoCercania } from '@/theme';

export default function Buscar() {
  useKeepAwake();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useEncuentrame((s) => s.dispositivos[id]);
  const yo = useEncuentrame((s) => s.miUbicacion);
  const rumboYo = useEncuentrame((s) => s.miRumbo);
  const vibracion = useEncuentrame((s) => s.vibracionCercania);
  const enviarComando = useEncuentrame((s) => s.enviarComando);
  const avisar = useEncuentrame((s) => s.avisar);
  const calibracion = useEncuentrame((s) => s.calibraciones[id]);
  const zona = useEncuentrame((s) => s.prefs[id]?.zona ?? null);
  const fuera = useEncuentrame((s) => !!s.fueraDeZona[id]);
  const ahora = useAhora(1000);

  const [sonando, setSonando] = useState(false);
  const [calibrando, setCalibrando] = useState(false);

  const rel = d ? relacion(yo, rumboYo, d.ubicacion) : null;
  useGeiger(rel?.distancia ?? null, vibracion && !!d?.enLinea);

  // El sonido del reloj se apaga solo a los 30 s.
  useEffect(() => {
    if (!sonando) return;
    const t = setTimeout(() => setSonando(false), 30000);
    return () => clearTimeout(t);
  }, [sonando]);

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!d) {
    return (
      <View style={[styles.fondo, styles.centro, { padding: 24, gap: 16 }]}>
        <Text style={styles.textoVacio}>Este reloj ya no está vinculado.</Text>
        <Boton texto="Volver" variante="secundario" onPress={volver} />
      </View>
    );
  }

  const color = d.color ?? C.cian;
  const tamano = Math.min(width - 72, height * 0.38, 320);
  const bateria = textoBateria(d.ubicacion?.bateria);
  const muyCerca = !!rel && rel.distancia <= Math.max(zona ? Math.min(8, zona * 0.6) : 8, Math.min(rel.precision, 15));
  const necesitaCalibrar = !calibracion && (!d.ubicacion || (yo?.precision ?? 0) > 12 || (d.ubicacion?.precision ?? 0) > 12);

  let indicacion: string;
  if (!yo) indicacion = 'Esperando tu ubicación';
  else if (!d.ubicacion)
    indicacion = d.enLinea
      ? `Esperando la ubicación de ${d.nombre}. Si está en una computadora, ponte a su lado y toca Calibrar juntos.`
      : `Esperando la ubicación de ${d.nombre}`;
  else if (ubicacionImprecisa(yo, d.ubicacion))
    indicacion =
      (d.ubicacion.precision ?? 0) > (yo.precision ?? 0)
        ? `La ubicación de ${d.nombre} es imprecisa. Ponte a su lado y toca Calibrar juntos.`
        : 'Tu GPS todavía es impreciso. Sal a un lugar abierto o espera unos segundos.';
  else if (muyCerca) indicacion = 'Está muy cerca. Hazlo sonar para ubicarlo.';
  else indicacion = `Hacia el ${cardinal(rel!.rumbo)}`;

  const alternarSonido = () => {
    const nuevo = !sonando;
    enviarComando(d.id, nuevo ? 'sonar' : 'detenerSonido');
    setSonando(nuevo);
  };

  const encontrado = () => {
    enviarComando(d.id, 'encontrado');
    if (sonando) enviarComando(d.id, 'detenerSonido');
    avisar({ tipo: 'exito', titulo: `Encontraste a ${d.nombre}` });
    volver();
  };

  return (
    <View style={styles.fondo}>
      {/* Barra superior */}
      <View style={[styles.barra, { paddingTop: insets.top + 8 }]}>
        <BotonIcono icono="chevron-back" etiqueta="Volver" onPress={volver} />
        <View style={styles.quien}>
          <Avatar nombre={d.nombre} color={color} tamano={34} enLinea={d.enLinea} />
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.nombre} numberOfLines={1}>
              {d.nombre}
            </Text>
            <Text style={styles.estado} numberOfLines={1}>
              {d.enLinea ? (bateria ? `Batería ${bateria}` : 'Conectado') : 'Desconectado'}
            </Text>
          </View>
        </View>
        <BotonIcono icono="ellipsis-horizontal" etiqueta="Ajustes del reloj" onPress={() => router.push({ pathname: '/dispositivo/[id]', params: { id: d.id } })} />
      </View>

      {/* Brújula y distancia */}
      <View style={styles.centro}>
        <Brujula angulo={rel?.angulo ?? 0} rumboTelefono={rumboYo} color={color} activa={!!rel} tamano={tamano} />

        <Text style={[styles.distancia, { color: rel ? colorCercania(rel.distancia, zona) : C.dim }]}>{rel ? textoDistancia(rel.distancia) : '—'}</Text>
        <Text style={styles.cercania}>{rel ? textoCercania(rel.distancia, zona) : ' '}</Text>
        <Text style={styles.indicacion}>{indicacion}</Text>

        <View style={styles.meta}>
          {zona ? <Text style={[styles.metaTexto, fuera && { color: C.rojo }]}>{fuera ? `Fuera de ${zona} m` : `Límite ${zona} m`}</Text> : null}
          {zona ? <Text style={styles.punto}>·</Text> : null}
          <Text style={styles.metaTexto}>
            Precisión ±{textoDistancia(Math.max(yo?.precision ?? 0, d.ubicacion?.precision ?? 0))}
          </Text>
          <Text style={styles.punto}>·</Text>
          <Pressable onPress={() => setCalibrando(true)} hitSlop={8} accessibilityLabel="Calibrar juntos">
            <Text style={[styles.metaTexto, styles.enlace, necesitaCalibrar && { color: C.text }]}>
              {calibracion ? `Calibrado ${haceCuanto(calibracion.ts, ahora)}` : 'Calibrar juntos'}
            </Text>
          </Pressable>
        </View>
        {rumboYo == null && rel ? (
          <Text style={styles.metaTexto}>{Platform.OS === 'web' ? 'Sin brújula: la flecha se orienta al norte' : 'Si la flecha tiembla, mueve el teléfono en forma de 8'}</Text>
        ) : null}
      </View>

      <CalibrarModal visible={calibrando} d={d} onCerrar={() => setCalibrando(false)} />

      {/* Acciones */}
      <View style={[styles.acciones, { paddingBottom: insets.bottom + 16 }]}>
        <Boton
          texto={sonando ? 'Detener sonido' : 'Hacer sonar'}
          icono={sonando ? 'volume-mute-outline' : 'volume-high-outline'}
          variante="secundario"
          onPress={alternarSonido}
          style={{ flex: 1 }}
        />
        <Boton texto="Lo encontré" icono="checkmark" onPress={encontrado} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: C.bg },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 4 },
  barra: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  quien: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  nombre: { color: C.text, fontSize: 16, fontWeight: '600' },
  estado: { color: C.muted, fontSize: 12.5 },
  textoVacio: { color: C.muted, fontSize: 15, textAlign: 'center' },
  distancia: { fontSize: 56, fontWeight: '300', letterSpacing: -1.5, fontVariant: ['tabular-nums'], marginTop: 18 },
  cercania: { color: C.text, fontSize: 15, fontWeight: '500' },
  indicacion: { color: C.muted, fontSize: 14.5, textAlign: 'center', marginTop: 2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 14 },
  metaTexto: { color: C.dim, fontSize: 12.5, textAlign: 'center' },
  punto: { color: C.dim, fontSize: 12.5 },
  enlace: { textDecorationLine: 'underline', color: C.muted },
  acciones: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 8 },
});
