import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Boton, Campo, Encabezado, FilaInterruptor, Pantalla } from '@/components/ui';
import { useEncuentrame } from '@/store/useEncuentrame';
import { C } from '@/theme';

/** Solo lo esencial: tu nombre y la vibración al acercarte. */
export default function Ajustes() {
  const miNombre = useEncuentrame((s) => s.miNombre);
  const vibracion = useEncuentrame((s) => s.vibracionCercania);
  const cambiarNombre = useEncuentrame((s) => s.cambiarNombre);
  const setVibracion = useEncuentrame((s) => s.setVibracionCercania);
  const [nombre, setNombre] = useState(miNombre);

  return (
    <Pantalla conFondo={false}>
      <Encabezado titulo="Ajustes" />

      <View style={styles.seccion}>
        <Campo
          etiqueta="Tu nombre"
          ayuda="Así te verán en el reloj."
          value={nombre}
          onChangeText={setNombre}
          onEndEditing={() => cambiarNombre(nombre)}
          onSubmitEditing={() => cambiarNombre(nombre)}
          placeholder="Ej. Mamá"
          maxLength={20}
        />
        {nombre.trim() && nombre.trim() !== miNombre ? (
          <Boton texto="Guardar" compacto variante="secundario" onPress={() => cambiarNombre(nombre)} />
        ) : null}
      </View>

      <View style={styles.seccion}>
        <FilaInterruptor
          titulo="Vibrar al acercarte"
          texto="Mientras buscas, el teléfono vibra más rápido cuanto más cerca estás."
          valor={vibracion}
          onCambio={setVibracion}
        />
      </View>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  seccion: { gap: 12, paddingVertical: 16, borderTopWidth: 1, borderTopColor: C.border },
});
