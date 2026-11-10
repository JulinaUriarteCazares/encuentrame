import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, RADIO } from '@/theme';

import { Fondo } from './Fondo';

export type NombreIcono = ComponentProps<typeof Ionicons>['name'];
export const ANCHO_MAX = 560;

export function Pantalla({ children, conFondo = true }: { children: ReactNode; conFondo?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {conFondo ? <Fondo /> : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.contenido, { paddingTop: insets.top + 14 }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.columna}>{children}</View>
      </ScrollView>
    </View>
  );
}

export function Encabezado({ titulo, subtitulo, izquierda, derecha }: { titulo: string; subtitulo?: string; izquierda?: ReactNode; derecha?: ReactNode }) {
  return (
    <View style={styles.encabezado}>
      {izquierda}
      <View style={{ flex: 1 }}>
        <Text style={styles.titulo}>{titulo}</Text>
        {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
      </View>
      {derecha}
    </View>
  );
}

export function Tarjeta({
  children,
  titulo,
  icono,
  style,
}: {
  children: ReactNode;
  titulo?: string;
  icono?: NombreIcono;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.tarjeta, style]}>
      {titulo ? (
        <View style={styles.tarjetaCabecera}>
          {icono ? <Ionicons name={icono} size={14} color={C.muted} /> : null}
          <Text style={styles.tarjetaTitulo}>{titulo}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma';
const VARIANTES: Record<Variante, { fondo: string; borde: string; texto: string }> = {
  primario: { fondo: C.text, borde: C.text, texto: C.bg },
  secundario: { fondo: C.card, borde: C.border, texto: C.text },
  peligro: { fondo: 'transparent', borde: C.border, texto: C.rojo },
  fantasma: { fondo: 'transparent', borde: 'transparent', texto: C.muted },
};

export function Boton({
  texto,
  onPress,
  variante = 'primario',
  icono,
  deshabilitado,
  cargando,
  compacto,
  style,
}: {
  texto: string;
  onPress: () => void;
  variante?: Variante;
  icono?: NombreIcono;
  deshabilitado?: boolean;
  cargando?: boolean;
  compacto?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = VARIANTES[variante];
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado || cargando}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.boton,
        compacto && styles.botonCompacto,
        { backgroundColor: v.fondo, borderColor: v.borde },
        (pressed || deshabilitado) && { opacity: deshabilitado ? 0.45 : 0.8 },
        style,
      ]}>
      {cargando ? (
        <ActivityIndicator color={v.texto} size="small" />
      ) : icono ? (
        <Ionicons name={icono} size={compacto ? 16 : 19} color={v.texto} />
      ) : null}
      <Text style={[styles.botonTexto, compacto && { fontSize: 14 }, { color: v.texto }]}>{texto}</Text>
    </Pressable>
  );
}

export function Chip({
  texto,
  color = C.muted,
  fondo = C.card2,
  onPress,
  activo,
  colorActivo = C.text,
}: {
  texto: string;
  color?: string;
  fondo?: string;
  onPress?: () => void;
  activo?: boolean;
  colorActivo?: string;
}) {
  const estilo = [styles.chip, { backgroundColor: activo ? colorActivo : fondo }];
  const contenido = (
    <Text style={[styles.chipTexto, { color: activo ? C.bg : color }]} numberOfLines={1}>
      {texto}
    </Text>
  );
  if (!onPress) return <View style={estilo}>{contenido}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [estilo, pressed && { opacity: 0.7 }]}>
      {contenido}
    </Pressable>
  );
}

export function Campo({ etiqueta, ayuda, ...props }: TextInputProps & { etiqueta: string; ayuda?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <TextInput placeholderTextColor={C.dim} {...props} style={[styles.campo, props.style]} />
      {ayuda ? <Text style={styles.ayuda}>{ayuda}</Text> : null}
    </View>
  );
}

export function FilaInterruptor({
  titulo,
  texto,
  valor,
  onCambio,
}: {
  titulo: string;
  texto?: string;
  valor: boolean;
  onCambio: (v: boolean) => void;
}) {
  return (
    <View style={styles.filaInterruptor}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.filaTitulo}>{titulo}</Text>
        {texto ? <Text style={styles.ayuda}>{texto}</Text> : null}
      </View>
      <Switch
        value={valor}
        onValueChange={onCambio}
        trackColor={{ false: C.borderFuerte, true: C.verde }}
        thumbColor={C.text}
      />
    </View>
  );
}

export function Fila({ etiqueta, valor, color }: { etiqueta: string; valor: string; color?: string }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.filaEtiqueta}>{etiqueta}</Text>
      <Text style={[styles.filaValor, color ? { color } : null]} numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

export function BotonIcono({
  icono,
  onPress,
  color = C.text,
  etiqueta,
  tamano = 42,
}: {
  icono: NombreIcono;
  onPress: () => void;
  color?: string;
  etiqueta: string;
  tamano?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={etiqueta}
      hitSlop={6}
      style={({ pressed }) => [
        styles.botonIcono,
        { width: tamano, height: tamano, borderRadius: tamano / 2 },
        pressed && { opacity: 0.7 },
      ]}>
      <Ionicons name={icono} size={tamano * 0.5} color={color} />
    </Pressable>
  );
}

export function Nota({ children }: { children: ReactNode }) {
  return <Text style={styles.nota}>{children}</Text>;
}

export const styles = StyleSheet.create({
  contenido: { paddingHorizontal: 16, paddingBottom: 40 },
  columna: { width: '100%', maxWidth: ANCHO_MAX, alignSelf: 'center', gap: 14 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  titulo: { color: C.text, fontSize: 26, fontWeight: '600', letterSpacing: -0.4 },
  subtitulo: { color: C.muted, fontSize: 14, marginTop: 1 },
  tarjeta: {
    backgroundColor: C.card,
    borderRadius: RADIO.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 12,
  },
  tarjetaCabecera: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tarjetaTitulo: { color: C.muted, fontSize: 13, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.6 },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: RADIO.md,
    borderWidth: 1,
  },
  botonCompacto: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: RADIO.sm },
  botonTexto: { fontSize: 15.5, fontWeight: '600' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, alignSelf: 'flex-start' },
  chipTexto: { fontSize: 13, fontWeight: '500' },
  etiqueta: { color: C.muted, fontSize: 13, fontWeight: '600' },
  campo: {
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.borderFuerte,
    borderRadius: RADIO.md,
    color: C.text,
    fontSize: 17,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  ayuda: { color: C.dim, fontSize: 12.5, lineHeight: 17 },
  filaInterruptor: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  filaTitulo: { color: C.text, fontSize: 15, fontWeight: '500' },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  filaEtiqueta: { color: C.muted, fontSize: 14 },
  filaValor: { color: C.text, fontSize: 14, fontWeight: '500', flexShrink: 1 },
  botonIcono: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  nota: { color: C.dim, fontSize: 12, lineHeight: 17, textAlign: 'center' },
});
