import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';

import type { NombreIcono } from '@/components/ui';
import { useEncuentrame } from '@/store/useEncuentrame';
import { C } from '@/theme';

function icono(nombre: NombreIcono) {
  function IconoTab({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={nombre} size={size} color={color as string} />;
  }
  return IconoTab;
}

export default function TabsLayout() {
  const alertas = useEncuentrame((s) => Object.values(s.fueraDeZona).filter(Boolean).length);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.ambar,
        tabBarInactiveTintColor: C.dim,
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.border },
        tabBarLabelStyle: { fontWeight: '500' },
        sceneStyle: { backgroundColor: C.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: icono('people-outline'),
          tabBarBadge: alertas || undefined,
          tabBarBadgeStyle: { backgroundColor: C.rojo, color: C.text },
        }}
      />
      <Tabs.Screen name="radar" options={{ title: 'Radar', tabBarIcon: icono('radio-outline') }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes', tabBarIcon: icono('settings-outline') }} />
    </Tabs>
  );
}
