import { StyleSheet, Text, View } from 'react-native';

import { C, conAlfa } from '@/theme';

/** Círculo con la inicial del nombre. El punto indica si está en línea. */
export function Avatar({
  nombre = '?',
  color = C.cian,
  tamano = 44,
  enLinea,
  alerta,
}: {
  nombre?: string;
  /** Se conserva por compatibilidad; ya no se muestra. */
  emoji?: string;
  color?: string;
  tamano?: number;
  enLinea?: boolean;
  alerta?: boolean;
}) {
  const punto = Math.max(9, tamano * 0.24);
  const inicial = (nombre.trim()[0] ?? '?').toUpperCase();
  return (
    <View style={{ width: tamano, height: tamano }}>
      <View
        style={[
          styles.circulo,
          {
            width: tamano,
            height: tamano,
            borderRadius: tamano / 2,
            backgroundColor: conAlfa(color, 0.16),
            borderColor: alerta ? C.rojo : 'transparent',
          },
        ]}>
        <Text style={{ color, fontSize: tamano * 0.42, fontWeight: '600' }}>{inicial}</Text>
      </View>
      {enLinea !== undefined ? (
        <View
          style={[
            styles.punto,
            { width: punto, height: punto, borderRadius: punto / 2, backgroundColor: enLinea ? C.verde : C.dim },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circulo: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  punto: { position: 'absolute', right: 0, bottom: 0, borderWidth: 2, borderColor: C.bg },
});
