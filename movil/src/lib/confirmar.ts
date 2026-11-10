import { Alert, Platform } from 'react-native';

/** Diálogo de confirmación que también funciona en la versión web. */
export function confirmar(titulo: string, mensaje: string, textoOk = 'Aceptar'): Promise<boolean> {
  if (Platform.OS === 'web') {
    const confirmWeb = (globalThis as { confirm?: (m: string) => boolean }).confirm;
    return Promise.resolve(confirmWeb ? confirmWeb(`${titulo}\n\n${mensaje}`) : true);
  }
  return new Promise((resolve) => {
    Alert.alert(
      titulo,
      mensaje,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: textoOk, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
