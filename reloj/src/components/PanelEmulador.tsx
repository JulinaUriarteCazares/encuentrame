import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { probarSonido } from '@/hooks/useAlarma';
import { relacion } from '@/lib/formato';
import { cardinal, diferencia, textoDistancia } from '@/lib/geo';
import { guardianActivo, rumboReloj, urlServidor, useReloj } from '@/store/useReloj';
import { C, conAlfa, RADIO } from '@/theme';

import { Avatar } from './Avatar';
import { PadSimulador, RANGO_PAD } from './PadSimulador';
import { Boton, BotonIcono, Campo, Chip, FilaInterruptor, Tarjeta } from './ui';

/** Dirección al azar (radianes) para colocar al niño en el mapa. */
const anguloAleatorio = () => Math.random() * Math.PI * 2;

function ChipConexion() {
  const estado = useReloj((s) => s.conexion);
  if (estado === 'conectado') return <Chip texto="● Conectado" color={C.verde} fondo={C.verdeSuave} />;
  if (estado === 'conectando') return <Chip texto="Conectando…" color={C.ambar} fondo={C.ambarSuave} />;
  if (estado === 'duplicado') return <Chip texto="Abierto en otra pestaña" color={C.ambar} fondo={C.ambarSuave} />;
  return <Chip texto="Sin servidor" color={C.rojo} fondo={C.rojoSuave} />;
}

/** Panel de control del emulador: identidad, ubicación simulada, orientación y pruebas. */
export function PanelEmulador({ ancho }: { ancho: number }) {
  const ranura = useReloj((s) => s.ranura);
  const miId = useReloj((s) => s.miId);
  const yo = useReloj((s) => s.yo);
  const guardianes = useReloj((s) => s.guardianes);
  const modo = useReloj((s) => s.modo);
  const paseo = useReloj((s) => s.paseo);
  const rumboSimulado = useReloj((s) => s.rumboSimulado);
  const rumboBrujula = useReloj((s) => s.rumboBrujula);
  const sonidoActivo = useReloj((s) => s.sonidoActivo);
  const personalizado = useReloj((s) => s.servidorPersonalizado);
  const url = useReloj((s) => urlServidor(s));
  const miUbicacion = useReloj((s) => s.miUbicacion);
  const ancla = useReloj((s) => s.ancla);
  const rumbo = useReloj(rumboReloj);
  const g = useReloj(guardianActivo);
  const acc = {
    setModo: useReloj((s) => s.setModo),
    fijarConTelefono: useReloj((s) => s.fijarConTelefono),
    setPaseo: useReloj((s) => s.setPaseo),
    setOffset: useReloj((s) => s.setOffset),
    setRumboSimulado: useReloj((s) => s.setRumboSimulado),
    recentrar: useReloj((s) => s.recentrar),
    setSonido: useReloj((s) => s.setSonidoActivo),
    setMostrarCodigo: useReloj((s) => s.setMostrarCodigo),
    desvincular: useReloj((s) => s.desvincular),
    enviarSos: useReloj((s) => s.enviarSos),
    cambiarServidor: useReloj((s) => s.cambiarServidor),
  };
  const [direccion, setDireccion] = useState(personalizado ?? '');

  const lista = Object.values(guardianes);
  const rel = relacion(miUbicacion, rumbo, g?.ubicacion);
  const tamPad = Math.min(ancho - 34, 380);

  /** Coloca al niño a cierta distancia del guardián (o junto a él). */
  const colocar = (metros: number) => {
    acc.setPaseo(false);
    const base = g?.ubicacion && ancla ? diferencia(ancla, g.ubicacion) : { este: 0, norte: 0 };
    const ang = anguloAleatorio();
    const lim = (n: number) => Math.round(Math.max(-RANGO_PAD, Math.min(RANGO_PAD, n)));
    acc.setOffset({ este: lim(base.este + Math.sin(ang) * metros), norte: lim(base.norte + Math.cos(ang) * metros) });
  };

  const abrirOtro = () => {
    const abrir = (globalThis as { open?: (u: string, d: string) => void }).open;
    abrir?.(`?reloj=${Number(ranura) + 1}`, '_blank');
  };

  return (
    <View style={{ width: ancho, gap: 14 }}>
      {/* Identidad */}
      <Tarjeta>
        <View style={styles.fila}>
          <Avatar emoji={yo?.emoji ?? '⌚'} color={yo?.color ?? C.cian} tamano={52} />
          <View style={{ flex: 1 }}>
            <Text style={styles.titulo}>{lista.length ? (yo?.nombre ?? 'Reloj') : 'Reloj sin vincular'}</Text>
            <Text style={styles.sub}>
              {Platform.OS === 'web' ? `Reloj #${ranura} · ` : ''}ID {miId.slice(0, 10)}
            </Text>
          </View>
          <ChipConexion />
        </View>

        {lista.length ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.etiqueta}>Vinculado con</Text>
            {lista.map((p) => (
              <View key={p.id} style={styles.guardian}>
                <View style={[styles.puntoEstado, { backgroundColor: p.enLinea ? C.verde : C.dim }]} />
                <Text style={styles.guardianNombre}>📱 {p.nombre}</Text>
                <Pressable onPress={() => acc.desvincular(p.id)} hitSlop={6}>
                  <Text style={styles.desvincular}>Desvincular</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.texto}>
            El reloj muestra un código y un QR. En el teléfono abre <Text style={styles.negrita}>Encuéntrame → Vincular un reloj</Text>.
          </Text>
        )}
        <View style={styles.botones}>
          {lista.length ? (
            <Boton texto="Vincular otro teléfono" icono="link" variante="secundario" compacto onPress={() => acc.setMostrarCodigo(true)} style={{ flex: 1 }} />
          ) : null}
          {Platform.OS === 'web' ? (
            <Boton texto="Abrir otro reloj" icono="add" variante="secundario" compacto onPress={abrirOtro} style={{ flex: 1 }} />
          ) : null}
        </View>
      </Tarjeta>

      {/* Ubicación */}
      <Tarjeta titulo="Ubicación del reloj" icono="location-outline">
        <View style={styles.segmentos}>
          {(['real', 'fija', 'simulada'] as const).map((m) => (
            <Pressable key={m} onPress={() => acc.setModo(m)} style={[styles.segmento, modo === m && styles.segmentoActivo]}>
              <Text style={[styles.segmentoTexto, modo === m && { color: '#1A1205' }]}>
                {m === 'real' ? '🛰️ GPS' : m === 'fija' ? '📌 Fija' : '🕹️ Simulada'}
              </Text>
            </Pressable>
          ))}
        </View>

        {modo === 'fija' ? (
          <>
            <Text style={styles.texto}>
              El reloj se queda en un punto fijo (una PC no se mueve). Pon el teléfono junto a la computadora y pulsa el botón:
              se usará el GPS del teléfono, que es mucho más preciso que la ubicación del navegador.
            </Text>
            <Boton texto="Fijar con la ubicación del teléfono" icono="pin" compacto onPress={() => acc.fijarConTelefono()} />
          </>
        ) : modo === 'simulada' ? (
          <>
            <PadSimulador tamano={tamPad} />
            <Text style={styles.texto}>
              Haz clic o arrastra en el mapa para mover a <Text style={styles.negrita}>{yo?.emoji} {yo?.nombre ?? 'el reloj'}</Text>. 📱 es el teléfono que lo busca.
            </Text>
            <FilaInterruptor titulo="Modo paseo" texto="Camina solo, como un niño en una fiesta." valor={paseo} onCambio={acc.setPaseo} />
            <View style={styles.botones}>
              <Boton texto="Junto a él" compacto variante="secundario" onPress={() => colocar(3)} style={{ flex: 1 }} />
              <Boton texto="A 30 m" compacto variante="secundario" onPress={() => colocar(30)} style={{ flex: 1 }} />
              <Boton texto="A 70 m" compacto variante="secundario" onPress={() => colocar(70)} style={{ flex: 1 }} />
            </View>
            <Boton texto="Centrar mapa en el teléfono" icono="locate" variante="fantasma" compacto onPress={acc.recentrar} />
          </>
        ) : (
          <Text style={styles.texto}>
            Usa el GPS del dispositivo. {Platform.OS === 'web' ? 'En una PC la ubicación es aproximada (por Wi‑Fi).' : 'Ideal para probar caminando con dos teléfonos.'}
          </Text>
        )}

        <View style={[styles.lectura, { borderColor: conAlfa(yo?.color ?? C.cian, 0.4) }]}>
          <Ionicons name="navigate" size={16} color={yo?.color ?? C.cian} />
          <Text style={styles.lecturaTexto}>
            {rel && g ? `A ${textoDistancia(rel.distancia)} de ${g.nombre}, hacia el ${cardinal(rel.rumbo)}` : g ? `Esperando la ubicación de ${g.nombre}…` : 'Sin teléfono vinculado'}
          </Text>
        </View>
      </Tarjeta>

      {/* Orientación (solo si no hay brújula real) */}
      {rumboBrujula == null ? (
        <Tarjeta titulo="Hacia dónde mira el reloj" icono="compass-outline">
          <View style={styles.orientacion}>
            <BotonIcono icono="arrow-undo" etiqueta="Girar a la izquierda" onPress={() => acc.setRumboSimulado(rumboSimulado - 30)} />
            <View style={{ alignItems: 'center', minWidth: 120 }}>
              <Text style={styles.grados}>{Math.round(rumboSimulado)}°</Text>
              <Text style={styles.sub}>mirando al {cardinal(rumboSimulado)}</Text>
            </View>
            <BotonIcono icono="arrow-redo" etiqueta="Girar a la derecha" onPress={() => acc.setRumboSimulado(rumboSimulado + 30)} />
          </View>
          <Text style={styles.texto}>La flecha del reloj se corrige según hacia dónde mira quien lo lleva puesto.</Text>
        </Tarjeta>
      ) : null}

      {/* Pruebas */}
      <Tarjeta titulo="Pruebas rápidas" icono="flask-outline">
        <FilaInterruptor
          titulo="Sonido del reloj"
          texto={Platform.OS === 'web' ? 'El navegador necesita un clic para permitir el audio.' : undefined}
          valor={sonidoActivo}
          onCambio={(v) => {
            acc.setSonido(v);
            if (v) probarSonido();
          }}
        />
        <View style={styles.botones}>
          <Boton texto="Probar sonido" icono="volume-high" variante="secundario" compacto onPress={probarSonido} style={{ flex: 1 }} />
          <Boton texto="Enviar SOS" icono="alert-circle" variante="peligro" compacto onPress={acc.enviarSos} deshabilitado={!lista.length} style={{ flex: 1 }} />
        </View>
      </Tarjeta>

      {/* Servidor */}
      <Tarjeta titulo="Servidor" icono="server-outline">
        <Campo
          etiqueta="Dirección (vacío = detectar sola)"
          value={direccion}
          onChangeText={setDireccion}
          placeholder={url}
          autoCapitalize="none"
          autoCorrect={false}
          ayuda={`Usando: ${url}`}
        />
        <Boton texto="Conectar" compacto variante="secundario" onPress={() => acc.cambiarServidor(direccion)} />
      </Tarjeta>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titulo: { color: C.text, fontSize: 18, fontWeight: '800' },
  sub: { color: C.muted, fontSize: 12.5 },
  etiqueta: { color: C.muted, fontSize: 12.5, fontWeight: '700' },
  texto: { color: C.muted, fontSize: 13.5, lineHeight: 19 },
  negrita: { color: C.text, fontWeight: '700' },
  guardian: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card2, borderRadius: RADIO.sm, padding: 10 },
  puntoEstado: { width: 9, height: 9, borderRadius: 5 },
  guardianNombre: { color: C.text, fontSize: 14.5, fontWeight: '700', flex: 1 },
  desvincular: { color: C.rojo, fontSize: 12.5, fontWeight: '700' },
  botones: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  segmentos: { flexDirection: 'row', backgroundColor: C.card2, borderRadius: RADIO.md, padding: 4, borderWidth: 1, borderColor: C.border },
  segmento: { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  segmentoActivo: { backgroundColor: C.ambar },
  segmentoTexto: { color: C.muted, fontWeight: '700', fontSize: 13.5 },
  lectura: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: RADIO.sm, padding: 10 },
  lecturaTexto: { color: C.text, fontSize: 13.5, fontWeight: '600', flex: 1 },
  orientacion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  grados: { color: C.text, fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
