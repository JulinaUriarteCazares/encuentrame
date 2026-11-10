import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, View } from 'react-native';

import type { DatosComando, Par } from '@/lib/protocolo';
import { useEncuentrame } from '@/store/useEncuentrame';
import { C, RADIO } from '@/theme';

import { Avatar } from './Avatar';
import { Boton } from './ui';

type Fase = 'inicio' | 'midiendo' | 'listo' | 'error';

/**
 * Calibrar juntos: con el teléfono pegado al reloj se promedia el GPS del teléfono 5 s
 * y el reloj corrige su ubicación con ese punto. Así las dos flechas apuntan bien.
 */
export function CalibrarModal({ visible, d, onCerrar }: { visible: boolean; d: Par; onCerrar: () => void }) {
  const calibrar = useEncuentrame((s) => s.calibrar);
  const [fase, setFase] = useState<Fase>('inicio');
  const [avance, setAvance] = useState(0);
  const [precision, setPrecision] = useState<number | null>(null);
  const [resultado, setResultado] = useState<DatosComando['calibrado'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const color = d.color ?? C.cian;

  const empezar = async () => {
    setFase('midiendo');
    setAvance(0);
    setError(null);
    try {
      const r = await calibrar(d.id, (a, p) => {
        setAvance(a);
        setPrecision(p);
      });
      setResultado(r);
      setFase('listo');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setFase('error');
    }
  };

  const cerrar = () => {
    setFase('inicio');
    setResultado(null);
    setError(null);
    onCerrar();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
      <View style={styles.fondo}>
        <View style={styles.tarjeta}>
          {fase === 'inicio' ? (
            <>
              <View style={styles.juntos}>
                <View style={[styles.telefono, { borderColor: C.borderFuerte }]}>
                  <Ionicons name="phone-portrait-outline" size={24} color={C.text} />
                </View>
                <Ionicons name="swap-horizontal" size={22} color={C.muted} />
                <Avatar nombre={d.nombre} color={color} tamano={52} />
              </View>
              <Text style={styles.titulo}>Calibrar juntos</Text>
              <View style={{ gap: 8, alignSelf: 'stretch' }}>
                <Paso n={1} texto={`Pon tu teléfono junto a ${d.nombre}, acostado, con la parte de arriba apuntando hacia la pantalla del reloj.`} />
                <Paso n={2} texto="No lo muevas durante 5 segundos." />
              </View>
              <Text style={styles.ayuda}>
                Se corrige el error del GPS de los dos. Si el reloj está en una computadora, queda fijo en ese punto y
                toma la brújula de tu teléfono para que su flecha te apunte.
              </Text>
              <Boton texto="Calibrar ahora" icono="locate" onPress={empezar} style={{ alignSelf: 'stretch' }} />
              <Boton texto="Cancelar" variante="fantasma" onPress={cerrar} />
            </>
          ) : fase === 'midiendo' ? (
            <>
              <ActivityIndicator size="large" color={C.ambar} />
              <Text style={styles.titulo}>Midiendo… {Math.max(0, Math.ceil(5 - avance * 5))} s</Text>
              <View style={styles.barra}>
                <View style={[styles.relleno, { width: `${avance * 100}%` }]} />
              </View>
              <Text style={styles.ayuda}>
                {precision != null ? `Precisión de tu GPS: ±${precision} m` : 'Esperando tu GPS…'} · no muevas los dispositivos
              </Text>
            </>
          ) : fase === 'listo' && resultado ? (
            <>
              <View style={[styles.circulo, { backgroundColor: C.verdeSuave }]}>
                <Ionicons name="checkmark" size={40} color={C.verde} />
              </View>
              <Text style={styles.titulo}>Calibrado</Text>
              <Text style={styles.texto}>
                {resultado.diferencia > 1
                  ? `Se corrigió una diferencia de ${resultado.diferencia} m entre los dos.`
                  : 'Los dos ya coincidían: no hizo falta corregir.'}
                {resultado.modo === 'fija' ? ` El reloj de ${d.nombre} quedó fijo en este punto.` : ''}
                {resultado.orientado ? ' Su flecha ya está orientada con tu brújula.' : ''}
              </Text>
              <Text style={styles.ayuda}>Ahora aléjate: la flecha del teléfono apunta al reloj y la del reloj apunta hacia ti.</Text>
              <Boton texto="Listo" onPress={cerrar} style={{ alignSelf: 'stretch' }} />
            </>
          ) : (
            <>
              <View style={[styles.circulo, { backgroundColor: C.rojoSuave }]}>
                <Ionicons name="close" size={40} color={C.rojo} />
              </View>
              <Text style={styles.titulo}>No se pudo calibrar</Text>
              <Text style={styles.texto}>{error}</Text>
              <Boton texto="Reintentar" icono="refresh" onPress={empezar} style={{ alignSelf: 'stretch' }} />
              <Boton texto="Cerrar" variante="fantasma" onPress={cerrar} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Paso({ n, texto }: { n: number; texto: string }) {
  return (
    <View style={styles.paso}>
      <View style={styles.pasoNumero}>
        <Text style={styles.pasoNumeroTexto}>{n}</Text>
      </View>
      <Text style={styles.texto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(3,6,12,0.82)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  tarjeta: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: C.card,
    borderRadius: RADIO.xl,
    borderWidth: 1,
    borderColor: C.borderFuerte,
    padding: 22,
    gap: 14,
    alignItems: 'center',
  },
  juntos: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  telefono: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card2,
  },
  titulo: { color: C.text, fontSize: 20, fontWeight: '600', textAlign: 'center' },
  texto: { color: C.text, fontSize: 14.5, lineHeight: 20, textAlign: 'center', flexShrink: 1 },
  ayuda: { color: C.muted, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  barra: { alignSelf: 'stretch', height: 10, borderRadius: 5, backgroundColor: C.card2, overflow: 'hidden' },
  relleno: { height: '100%', backgroundColor: C.ambar, borderRadius: 5 },
  circulo: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pasoNumero: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.ambarSuave, alignItems: 'center', justifyContent: 'center' },
  pasoNumeroTexto: { color: C.text, fontWeight: '600', fontSize: 13 },
});
