import { StyleSheet, View } from 'react-native';

import { C } from '@/theme';

/** Fondo plano (el diseño es sobrio: sin halos ni degradados). */
export function Fondo(_: { tinte?: string }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: C.bg }]} />;
}
