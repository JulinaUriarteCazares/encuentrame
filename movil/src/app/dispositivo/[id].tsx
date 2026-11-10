import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { EditorPerfil } from '@/components/EditorPerfil';
import { Boton, Nota, Pantalla, Tarjeta } from '@/components/ui';
import { confirmar } from '@/lib/confirmar';
import { useEncuentrame, type PerfilNuevo } from '@/store/useEncuentrame';
import { C } from '@/theme';

export default function AjustesDispositivo() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useEncuentrame((s) => s.dispositivos[id]);
  const zona = useEncuentrame((s) => s.prefs[id]?.zona ?? null);
  const editar = useEncuentrame((s) => s.editarDispositivo);
  const desvincular = useEncuentrame((s) => s.desvincular);
  const [perfil, setPerfil] = useState<PerfilNuevo>(() => ({
    nombre: d?.nombre ?? '',
    emoji: d?.emoji ?? '⌚',
    color: d?.color ?? C.cian,
    zona,
  }));

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!d) {
    return (
      <Pantalla conFondo={false}>
        <Text style={{ color: C.muted, textAlign: 'center' }}>Este dispositivo ya no está vinculado.</Text>
      </Pantalla>
    );
  }

  const guardar = () => {
    editar(d.id, { ...perfil, nombre: perfil.nombre.trim() || d.nombre });
    volver();
  };

  const quitar = async () => {
    const ok = await confirmar(
      `Desvincular a ${d.nombre}`,
      'Dejarás de ver su ubicación y su reloj ya no podrá encontrarte. Para volver a vincularlo necesitarás un código nuevo.',
      'Desvincular',
    );
    if (ok) {
      desvincular(d.id);
      router.replace('/');
    }
  };

  return (
    <Pantalla conFondo={false}>
      <Tarjeta>
        <EditorPerfil perfil={perfil} onCambio={setPerfil} />
      </Tarjeta>
      <Boton texto="Guardar cambios" icono="checkmark" onPress={guardar} />
      <Boton texto={`Desvincular a ${d.nombre}`} icono="unlink" variante="peligro" onPress={quitar} />
      <Nota>Los cambios de nombre y color también se ven en su reloj.</Nota>
    </Pantalla>
  );
}
