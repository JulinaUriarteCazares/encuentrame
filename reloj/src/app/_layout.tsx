import { activateKeepAwakeAsync } from 'expo-keep-awake';
import { DarkTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { useAlarma } from '@/hooks/useAlarma';
import { useSensores } from '@/hooks/useSensores';
import { useReloj } from '@/store/useReloj';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const TEMA: Theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, primary: C.ambar, background: C.bg, card: C.card, text: C.text, border: C.border },
};

export default function RootLayout() {
  const listo = useReloj((s) => s.listo);
  const iniciar = useReloj((s) => s.iniciar);
  const reconectar = useReloj((s) => s.reconectar);

  useEffect(() => {
    iniciar();
    // Un reloj no debe apagar la pantalla mientras se usa.
    if (Platform.OS !== 'web') activateKeepAwakeAsync().catch(() => undefined);
  }, [iniciar]);

  useEffect(() => {
    if (listo) SplashScreen.hideAsync().catch(() => undefined);
  }, [listo]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (e) => e === 'active' && reconectar());
    return () => sub.remove();
  }, [reconectar]);

  useSensores();
  useAlarma();

  return (
    <ThemeProvider value={TEMA}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
    </ThemeProvider>
  );
}
