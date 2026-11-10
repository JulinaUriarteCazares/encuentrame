import { DarkTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertaSOS } from '@/components/AlertaSOS';
import { AlertaSonando } from '@/components/AlertaSonando';
import { Avisos } from '@/components/Avisos';
import { useSeguimiento } from '@/hooks/useSeguimiento';
import { useEncuentrame } from '@/store/useEncuentrame';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const TEMA: Theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, primary: C.text, background: C.bg, card: C.bg, text: C.text, border: C.border },
};

const CABECERA = {
  headerShown: true,
  headerStyle: { backgroundColor: C.bg },
  headerTintColor: C.text,
  headerTitleStyle: { fontWeight: '600' as const },
  headerShadowVisible: false,
};

export default function RootLayout() {
  const listo = useEncuentrame((s) => s.listo);
  const iniciar = useEncuentrame((s) => s.iniciar);
  const reconectar = useEncuentrame((s) => s.reconectar);
  const hayAvisos = useEncuentrame((s) => s.avisos.length > 0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    iniciar();
  }, [iniciar]);

  useEffect(() => {
    if (listo) SplashScreen.hideAsync().catch(() => undefined);
  }, [listo]);

  // Al volver a la app, reconecta de inmediato.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (e) => e === 'active' && reconectar());
    return () => sub.remove();
  }, [reconectar]);

  useSeguimiento();

  return (
    <ThemeProvider value={TEMA}>
      <StatusBar style="light" />
      <View style={styles.raiz}>
        {/* Los avisos ocupan su propio espacio arriba: el contenido baja, nada queda encimado. */}
        <Avisos margenSuperior={insets.top} />
        <SafeAreaInsetsContext.Provider value={hayAvisos ? { ...insets, top: 0 } : insets}>
          <View style={{ flex: 1 }}>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="vincular" options={{ ...CABECERA, title: 'Vincular reloj', presentation: 'modal' }} />
              <Stack.Screen name="buscar/[id]" options={{ animation: 'fade' }} />
              <Stack.Screen name="dispositivo/[id]" options={{ ...CABECERA, title: 'Ajustes del reloj' }} />
            </Stack>
          </View>
        </SafeAreaInsetsContext.Provider>
        {/* Estados de pantalla completa (no se enciman: reemplazan la vista mientras duran). */}
        <AlertaSonando />
        <AlertaSOS />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: C.bg },
});
