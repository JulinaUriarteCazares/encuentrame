import Ionicons from '@expo/vector-icons/Ionicons';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { CaraReloj } from '@/components/CaraReloj';
import { PanelEmulador } from '@/components/PanelEmulador';
import { useReloj } from '@/store/useReloj';
import { C } from '@/theme';

/** Alto total del reloj (con correas) respecto al tamaño de su pantalla. */
const PROPORCION_ALTO = 1.62;
const PROPORCION_ANCHO = 1.22;

/**
 * Encuéntrame Reloj.
 * Se ve SOLO el smartwatch, como en un emulador: todo se maneja desde su pantalla
 * (deslizar, corona, botón lateral, teclas ← →). Las herramientas de prueba solo
 * aparecen si se activan desde Ajustes del propio reloj (o con ?panel=1).
 */
export default function Reloj() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listo = useReloj((s) => s.listo);
  const panel = useReloj((s) => s.panelPruebas);
  const cerrarPanel = useReloj((s) => s.setPanelPruebas);

  if (!listo) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  const web = Platform.OS === 'web';
  const panelLateral = panel && web && width >= 1000;
  const anchoPanel = panelLateral ? 420 : width;
  const anchoDisponible = (panelLateral ? width - anchoPanel : width) - 32;
  const altoDisponible = height - insets.top - insets.bottom - 32;
  const tamano = Math.round(Math.max(200, Math.min(anchoDisponible / PROPORCION_ANCHO, altoDisponible / PROPORCION_ALTO, web ? 420 : 380)));

  return (
    <View style={styles.fondo}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="luz" cx="50%" cy="45%" r="60%">
            <Stop offset="0" stopColor="#1A2236" />
            <Stop offset="1" stopColor="#04060A" />
          </RadialGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#luz)" />
      </Svg>

      <View style={[styles.reloj, { right: panelLateral ? anchoPanel : 0 }]}>
        <CaraReloj tamano={tamano} />
      </View>

      {panel ? (
        <View style={[styles.panel, panelLateral ? { width: anchoPanel } : { left: 0 }, { paddingTop: insets.top }]}>
          <View style={styles.panelCabecera}>
            <Text style={styles.panelTitulo}>🧪 Herramientas de prueba</Text>
            <Pressable onPress={() => cerrarPanel(false)} hitSlop={10} accessibilityLabel="Ocultar herramientas de prueba">
              <Ionicons name="close" size={24} color={C.muted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            <PanelEmulador ancho={Math.min(anchoPanel, 560) - 32} />
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#04060A' },
  reloj: { position: 'absolute', left: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  panel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(7,11,20,0.97)',
    borderLeftWidth: 1,
    borderLeftColor: C.border,
  },
  panelCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  panelTitulo: { color: C.text, fontSize: 16, fontWeight: '800' },
});
