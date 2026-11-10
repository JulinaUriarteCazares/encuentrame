import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C } from '@/theme';

import { Boton } from './ui';

/** Abre la cámara y lee el QR que muestra el reloj (contiene el código de 6 dígitos). */
export function EscanerQR({ visible, onCodigo, onCerrar }: { visible: boolean; onCodigo: (c: string) => void; onCerrar: () => void }) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [leido, setLeido] = useState(false);
  const insets = useSafeAreaInsets();

  const alLeer = ({ data }: { data: string }) => {
    if (leido) return;
    const m = /(\d{6})/.exec(data);
    if (!m) return;
    setLeido(true);
    onCodigo(m[1]);
    onCerrar();
    setTimeout(() => setLeido(false), 1500);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar} statusBarTranslucent>
      <View style={styles.fondo}>
        {!permiso?.granted ? (
          <View style={[styles.centro, { padding: 24, gap: 16 }]}>
            <Text style={styles.titulo}>Permite usar la cámara</Text>
            <Text style={styles.texto}>La usamos solo para leer el código QR que aparece en el reloj.</Text>
            <Boton texto="Permitir cámara" icono="camera" onPress={pedirPermiso} />
            <Boton texto="Cancelar" variante="fantasma" onPress={onCerrar} />
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={alLeer}
            />
            <View style={[StyleSheet.absoluteFill, styles.centro]} pointerEvents="none">
              <View style={styles.marco} />
              <Text style={[styles.texto, { marginTop: 22 }]}>Apunta al QR que muestra el reloj</Text>
            </View>
            <View style={[styles.abajo, { paddingBottom: insets.bottom + 20 }]}>
              <Boton texto="Cancelar" variante="secundario" onPress={onCerrar} />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: '#000' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  marco: { width: 240, height: 240, borderRadius: 20, borderWidth: 2, borderColor: C.text },
  titulo: { color: C.text, fontSize: 22, fontWeight: '600', textAlign: 'center' },
  texto: { color: C.text, fontSize: 15, textAlign: 'center', textShadowColor: '#000', textShadowRadius: 6 },
  abajo: { position: 'absolute', left: 20, right: 20, bottom: 0 },
});
