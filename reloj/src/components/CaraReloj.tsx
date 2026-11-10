import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Animated, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Circle, Line } from 'react-native-svg';

import { useAhora } from '@/hooks/useAhora';
import { haceCuanto, relacion, textoBateria, ubicacionImprecisa } from '@/lib/formato';
import { cardinal, textoDistancia } from '@/lib/geo';
import { rumboReloj, useReloj } from '@/store/useReloj';
import { C } from '@/theme';

import { BotonSOS } from './BotonSOS';
import { FlechaReloj } from './FlechaReloj';

type Icono = ComponentProps<typeof Ionicons>['name'];

const PAGINAS = ['Flecha', 'SOS', 'Ajustes'] as const;
const P_FLECHA = 0;
const P_SOS = 1;
const TICKS = Array.from({ length: 12 }, (_, i) => i * 30);

/** El smartwatch: correa, bisel, corona y pantalla redonda táctil. */
export function CaraReloj({ tamano }: { tamano: number }) {
  const k = tamano / 300;
  const t = (n: number) => n * k;

  const conexion = useReloj((s) => s.conexion);
  const guardianes = useReloj((s) => s.guardianes);
  const activo = useReloj((s) => s.activo);
  const codigo = useReloj((s) => s.codigo);
  const mostrarCodigo = useReloj((s) => s.mostrarCodigo);
  const miUbicacion = useReloj((s) => s.miUbicacion);
  const gpsImpreciso = useReloj((s) => s.gpsImpreciso);
  const modo = useReloj((s) => s.modo);
  const rumbo = useReloj(rumboReloj);
  const bateria = useReloj((s) => s.bateria);
  const sonidoActivo = useReloj((s) => s.sonidoActivo);
  const panelPruebas = useReloj((s) => s.panelPruebas);
  const sonando = useReloj((s) => s.sonando);
  const sonandoTelefono = useReloj((s) => s.sonandoTelefono);
  const zona = useReloj((s) => s.zona);
  const sos = useReloj((s) => s.sos);
  const encontrado = useReloj((s) => s.encontrado);
  const vinculadoReciente = useReloj((s) => s.vinculadoReciente);
  const calibradoReciente = useReloj((s) => s.calibradoReciente);
  const correccion = useReloj((s) => s.correccion);
  const acc = {
    pedirCodigo: useReloj((s) => s.pedirCodigo),
    setMostrarCodigo: useReloj((s) => s.setMostrarCodigo),
    siguienteGuardian: useReloj((s) => s.siguienteGuardian),
    enviarSos: useReloj((s) => s.enviarSos),
    alternarSonarTelefono: useReloj((s) => s.alternarSonarTelefono),
    detenerSonido: useReloj((s) => s.detenerSonido),
    cerrar: useReloj((s) => s.cerrar),
    setModo: useReloj((s) => s.setModo),
    fijarConTelefono: useReloj((s) => s.fijarConTelefono),
    setSonido: useReloj((s) => s.setSonidoActivo),
    setPanelPruebas: useReloj((s) => s.setPanelPruebas),
    quitarCorreccion: useReloj((s) => s.quitarCorreccion),
  };

  const ahora = useAhora(1000);
  const [pagina, setPagina] = useState(P_FLECHA);
  const [nota, setNota] = useState<string | null>(null);
  const [destello] = useState(() => new Animated.Value(0));
  const ultimoPedido = useRef(0);

  const lista = Object.values(guardianes);
  const g = (activo && guardianes[activo]) || lista[0] || null;
  const varios = lista.length > 1;
  const rel = relacion(miUbicacion, rumbo, g?.ubicacion);
  const sinVincular = !lista.length || mostrarCodigo;
  const nombreDe = (id: string) => guardianes[id]?.nombre ?? 'Tu familia';

  // Código nuevo cuando el actual vence.
  useEffect(() => {
    if (!sinVincular || conexion !== 'conectado' || !codigo || ahora < codigo.expira) return;
    if (ahora - ultimoPedido.current < 4000) return;
    ultimoPedido.current = ahora;
    acc.pedirCodigo();
  }, [sinVincular, conexion, codigo, ahora]); // eslint-disable-line react-hooks/exhaustive-deps

  // Avisos que se cierran solos
  useEffect(() => {
    if (!calibradoReciente) return;
    const x = setTimeout(() => acc.cerrar('calibradoReciente'), 3500);
    return () => clearTimeout(x);
  }, [calibradoReciente]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!vinculadoReciente) return;
    const x = setTimeout(() => acc.cerrar('vinculadoReciente'), 3000);
    return () => clearTimeout(x);
  }, [vinculadoReciente]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!zona || zona.fuera) return;
    const x = setTimeout(() => acc.cerrar('zona'), 3000);
    return () => clearTimeout(x);
  }, [zona]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!nota) return;
    const x = setTimeout(() => setNota(null), 2500);
    return () => clearTimeout(x);
  }, [nota]);

  // Pulso suave de la pantalla mientras suena
  useEffect(() => {
    if (!sonando) return;
    const nativo = Platform.OS !== 'web';
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(destello, { toValue: 1, duration: 450, useNativeDriver: nativo }),
        Animated.timing(destello, { toValue: 0, duration: 450, useNativeDriver: nativo }),
      ]),
    );
    anim.start();
    return () => {
      anim.stop();
      destello.setValue(0);
    };
  }, [sonando, destello]);

  // En la PC, las flechas ← → del teclado funcionan como deslizar.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setPagina((p) => Math.min(p + 1, PAGINAS.length - 1));
      if (e.key === 'ArrowLeft') setPagina((p) => Math.max(p - 1, 0));
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 14 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -30) setPagina((p) => Math.min(p + 1, PAGINAS.length - 1));
        else if (gs.dx > 30) setPagina((p) => Math.max(p - 1, 0));
      },
    }),
  );

  const fecha = new Date(ahora);
  const hora = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
  const bat = textoBateria(bateria);
  const muyCerca = !!rel && rel.distancia <= Math.max(5, Math.min(rel.precision, 15));

  // ---------- Pantallas ----------
  let contenido: ReactNode;
  if (sinVincular) {
    const restante = codigo ? Math.max(0, codigo.expira - ahora) : 0;
    const mmss = `${Math.floor(restante / 60000)}:${String(Math.floor((restante % 60000) / 1000)).padStart(2, '0')}`;
    contenido = (
      <>
        <Text style={[s.etiqueta, { fontSize: t(11) }]}>Vincular</Text>
        {conexion === 'conectado' && codigo ? (
          <>
            <View style={{ backgroundColor: '#fff', padding: t(6), borderRadius: t(8), marginVertical: t(6) }}>
              <QRCode value={`encuentrame:${codigo.codigo}`} size={t(84)} backgroundColor="#ffffff" color="#111111" />
            </View>
            <Text style={[s.codigo, { fontSize: t(26), letterSpacing: t(3) }]}>
              {codigo.codigo.slice(0, 3)} {codigo.codigo.slice(3)}
            </Text>
            <Text style={[s.pequeno, { fontSize: t(10) }]}>Escríbelo en el teléfono · {mmss}</Text>
          </>
        ) : (
          <>
            <ActivityIndicator color={C.muted} style={{ marginVertical: t(12) }} />
            <Text style={[s.pequeno, { fontSize: t(11), textAlign: 'center' }]}>
              {conexion === 'duplicado' ? 'Este reloj está abierto en otra pestaña' : 'Conectando…'}
            </Text>
          </>
        )}
        {mostrarCodigo && lista.length ? (
          <Pressable onPress={() => acc.setMostrarCodigo(false)} hitSlop={8} style={{ marginTop: t(6) }}>
            <Text style={{ color: C.muted, fontSize: t(11) }}>Cancelar</Text>
          </Pressable>
        ) : null}
      </>
    );
  } else if (pagina === P_FLECHA) {
    // Pantalla principal: siempre apunta hacia el teléfono.
    contenido = g ? (
      <>
        <Pressable onPress={acc.siguienteGuardian} disabled={!varios} hitSlop={6}>
          <Text style={[s.pequeno, { fontSize: t(11) }]} numberOfLines={1}>
            {g.nombre}
            {varios ? '  ›' : ''}
          </Text>
        </Pressable>
        <FlechaReloj angulo={rel?.angulo ?? 0} rumbo={rumbo} color={C.text} activa={!!rel} tamano={t(118)} />
        <Text style={[s.distancia, { fontSize: t(30), color: muyCerca ? C.verde : C.text }]}>{rel ? textoDistancia(rel.distancia) : '—'}</Text>
        <Text style={[s.pequeno, { fontSize: t(10.5) }]}>
          {!g.enLinea
            ? 'Teléfono desconectado'
            : (!miUbicacion && gpsImpreciso != null) || ubicacionImprecisa(miUbicacion, g.ubicacion)
              ? 'Calibra con el teléfono'
              : !rel
                ? 'Buscando ubicación…'
                : muyCerca ? 'Muy cerca' : `hacia el ${cardinal(rel.rumbo)}`}
        </Text>
        <Pressable
          onPress={acc.alternarSonarTelefono}
          accessibilityLabel={sonandoTelefono ? 'Dejar de sonar el teléfono' : 'Hacer sonar el teléfono'}
          style={({ pressed }) => [
            s.pastilla,
            { marginTop: t(8), paddingHorizontal: t(12), paddingVertical: t(6), gap: t(5) },
            sonandoTelefono && { backgroundColor: C.text, borderColor: C.text },
            pressed && { opacity: 0.6 },
          ]}>
          <Ionicons name={sonandoTelefono ? 'volume-mute-outline' : 'volume-high-outline'} size={t(13)} color={sonandoTelefono ? C.bg : C.text} />
          <Text style={{ color: sonandoTelefono ? C.bg : C.text, fontSize: t(11), fontWeight: '500' }}>
            {sonandoTelefono ? 'Detener' : 'Sonar teléfono'}
          </Text>
        </Pressable>
      </>
    ) : null;
  } else if (pagina === P_SOS) {
    contenido = (
      <>
        <Text style={[s.etiqueta, { fontSize: t(11) }]}>Emergencia</Text>
        <View style={{ marginVertical: t(10) }}>
          <BotonSOS tamano={t(120)} onEnviar={acc.enviarSos} />
        </View>
        <Text style={[s.pequeno, { fontSize: t(10.5), textAlign: 'center' }]}>Mantén presionado 2 s</Text>
      </>
    );
  } else {
    const textoModo = modo === 'fija' ? 'Fija' : modo === 'simulada' ? 'Simulada' : 'GPS';
    contenido = (
      <>
        <Text style={[s.etiqueta, { fontSize: t(11) }]}>Ajustes</Text>
        <ScrollView showsVerticalScrollIndicator={false} style={{ height: t(150), alignSelf: 'stretch', marginTop: t(6) }} contentContainerStyle={{ gap: t(4), paddingBottom: t(6) }}>
          <Opcion k={k} icono="locate-outline" titulo="Ubicación" valor={textoModo} onPress={() => acc.setModo(modo === 'real' ? 'fija' : 'real')} />
          <Opcion
            k={k}
            icono="pin-outline"
            titulo="Fijar con el teléfono"
            onPress={() => setNota(acc.fijarConTelefono() ? 'Posición fijada' : 'El teléfono aún no envía su ubicación')}
          />
          {correccion ? (
            <Opcion
              k={k}
              icono="close-circle-outline"
              titulo="Quitar corrección"
              valor={`${Math.round(Math.hypot(correccion.este, correccion.norte))} m`}
              onPress={() => {
                acc.quitarCorreccion();
                setNota('Corrección quitada');
              }}
            />
          ) : null}
          <Opcion k={k} icono={sonidoActivo ? 'volume-high-outline' : 'volume-mute-outline'} titulo="Sonido" valor={sonidoActivo ? 'Sí' : 'No'} onPress={() => acc.setSonido(!sonidoActivo)} />
          <Opcion k={k} icono="link-outline" titulo="Vincular otro teléfono" onPress={() => acc.setMostrarCodigo(true)} />
          <Opcion k={k} icono="construct-outline" titulo="Herramientas de prueba" valor={panelPruebas ? 'Visibles' : 'Ocultas'} onPress={() => acc.setPanelPruebas(!panelPruebas)} />
        </ScrollView>
        <Text style={{ color: C.dim, fontSize: t(10), textAlign: 'center' }}>
          {nota ?? (miUbicacion ? `Precisión ±${Math.round(miUbicacion.precision ?? 0)} m` : 'Sin ubicación')}
        </Text>
      </>
    );
  }

  // ---------- Estados de pantalla completa (por prioridad) ----------
  let capa: ReactNode = null;
  if (sonando) {
    capa = (
      <View style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.text, opacity: destello.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }) }]} />
        <Capa k={k} tamano={tamano} icono="volume-high-outline" titulo="Te están buscando" texto="Levanta la mano para que te vean" botones={[{ texto: 'Detener', onPress: acc.detenerSonido, principal: true }]} />
      </View>
    );
  } else if (sos) {
    capa =
      sos.estado === 'enviado' ? (
        <Capa k={k} tamano={tamano} icono="alert-circle-outline" color={C.rojo} titulo="Ayuda enviada" texto={`Avisando a tu familia · ${haceCuanto(sos.ts, ahora)}`} />
      ) : (
        <Capa
          k={k}
          tamano={tamano}
          icono="checkmark-circle-outline"
          color={C.verde}
          titulo={`${g?.nombre ?? 'Tu familia'} ya viene`}
          texto="Quédate donde estás."
          botones={[{ texto: 'OK', onPress: () => acc.cerrar('sos'), principal: true }]}
        />
      );
  } else if (zona?.fuera) {
    capa = (
      <Capa
        k={k}
        tamano={tamano}
        icono="walk-outline"
        color={C.rojo}
        titulo="Te alejaste"
        texto={`Estás a ${textoDistancia(zona.metros)} de ${nombreDe(zona.de)} (máx. ${zona.limite} m)`}
        botones={[
          {
            texto: 'Ver flecha',
            principal: true,
            onPress: () => {
              acc.cerrar('zona');
              setPagina(P_FLECHA);
            },
          },
        ]}
      />
    );
  } else if (encontrado) {
    capa = (
      <Capa k={k} tamano={tamano} icono="happy-outline" color={C.verde} titulo={`${nombreDe(encontrado.de)} te encontró`} botones={[{ texto: 'OK', onPress: () => acc.cerrar('encontrado'), principal: true }]} />
    );
  }

  // Avisos breves (no tapan la pantalla: aparecen como una línea arriba)
  const avisoBreve = calibradoReciente
    ? calibradoReciente.diferencia > 1
      ? `Calibrado · ${calibradoReciente.diferencia} m corregidos`
      : 'Calibrado'
    : vinculadoReciente
      ? `Vinculado con ${vinculadoReciente.nombre}`
      : zona && !zona.fuera
        ? 'De vuelta en la zona'
        : null;

  // ---------- Hardware ----------
  const bisel = t(16);
  const total = tamano + bisel * 2;
  const altoCorrea = tamano * 0.3;
  const solape = t(18);
  const anchoCorrea = tamano * 0.56;
  return (
    <View style={{ width: total + t(24), height: total + 2 * (altoCorrea - solape) }}>
      <View style={{ position: 'absolute', top: 0, left: t(12) + (total - anchoCorrea) / 2 }}>
        <Correa ancho={anchoCorrea} alto={altoCorrea} k={k} arriba />
      </View>
      <View style={{ position: 'absolute', top: altoCorrea - solape + total - solape, left: t(12) + (total - anchoCorrea) / 2 }}>
        <Correa ancho={anchoCorrea} alto={altoCorrea} k={k} />
      </View>
      <View style={{ position: 'absolute', top: altoCorrea - solape, left: t(12), width: total, height: total }}>
        <Svg width={total} height={total} style={StyleSheet.absoluteFill}>
          <Circle cx={total / 2} cy={total / 2} r={total / 2 - 0.5} fill="#2A2B2F" stroke="#3A3B40" strokeWidth={1} />
          <Circle cx={total / 2} cy={total / 2} r={total / 2 - t(5)} fill="#141517" />
          {TICKS.map((a) => {
            const rad = (a * Math.PI) / 180;
            const r1 = total / 2 - t(7);
            const r2 = r1 - t(4);
            return (
              <Line
                key={a}
                x1={total / 2 + Math.sin(rad) * r1}
                y1={total / 2 - Math.cos(rad) * r1}
                x2={total / 2 + Math.sin(rad) * r2}
                y2={total / 2 - Math.cos(rad) * r2}
                stroke="#4A4B51"
                strokeWidth={t(1.2)}
              />
            );
          })}
        </Svg>

        <View {...pan.panHandlers} style={[s.pantalla, { position: 'absolute', left: bisel, top: bisel, width: tamano, height: tamano, borderRadius: tamano / 2 }]}>
          {/* Barra de estado */}
          <View style={[s.estado, { top: t(18), gap: t(6) }]}>
            <Text style={{ color: C.text, fontSize: t(12), fontWeight: '500', fontVariant: ['tabular-nums'] }}>{hora}</Text>
            {bat ? <Text style={{ color: C.dim, fontSize: t(10.5) }}>{bat}</Text> : null}
            {conexion !== 'conectado' ? <View style={{ width: t(6), height: t(6), borderRadius: t(3), backgroundColor: C.rojo }} /> : null}
          </View>
          {avisoBreve && !capa ? (
            <Text style={[s.avisoBreve, { top: t(36), fontSize: t(10) }]} numberOfLines={1}>
              {avisoBreve}
            </Text>
          ) : null}

          <View style={{ width: tamano * 0.74, alignItems: 'center', marginTop: avisoBreve ? t(10) : 0 }}>{contenido}</View>

          {!sinVincular ? (
            <View style={[s.puntos, { bottom: t(14), gap: t(5) }]}>
              {PAGINAS.map((p, i) => (
                <Pressable key={p} onPress={() => setPagina(i)} hitSlop={6} accessibilityLabel={`Pantalla ${p}`}>
                  <View style={{ width: t(5), height: t(5), borderRadius: t(3), backgroundColor: i === pagina ? C.text : '#3A3B40' }} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {capa}
        </View>

        {/* Corona: siguiente pantalla · Botón lateral: volver a la flecha */}
        <Pressable
          onPress={() => setPagina((p) => (p + 1) % PAGINAS.length)}
          accessibilityLabel="Corona: siguiente pantalla"
          style={({ pressed }) => [s.corona, { right: -t(9), top: total / 2 - t(20), width: t(12), height: t(40), borderRadius: t(4) }, pressed && { backgroundColor: '#55565C' }]}
        />
        <Pressable
          onPress={() => setPagina(P_FLECHA)}
          accessibilityLabel="Botón lateral: flecha"
          style={({ pressed }) => [s.corona, { right: -t(6), top: total / 2 + t(38), width: t(8), height: t(24), borderRadius: t(3) }, pressed && { backgroundColor: '#55565C' }]}
        />
      </View>
    </View>
  );
}

function Correa({ ancho, alto, k, arriba }: { ancho: number; alto: number; k: number; arriba?: boolean }) {
  const radio = 20 * k;
  return (
    <View
      style={[
        { width: ancho, height: alto, backgroundColor: '#1C1D20' },
        arriba ? { borderTopLeftRadius: radio, borderTopRightRadius: radio } : { borderBottomLeftRadius: radio, borderBottomRightRadius: radio },
      ]}
    />
  );
}

function Opcion({ k, icono, titulo, valor, onPress }: { k: number; icono: Icono; titulo: string; valor?: string; onPress: () => void }) {
  const t = (n: number) => n * k;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={titulo}
      style={({ pressed }) => [s.opcion, { paddingHorizontal: t(10), paddingVertical: t(7), borderRadius: t(10), gap: t(8) }, pressed && { backgroundColor: '#26272B' }]}>
      <Ionicons name={icono} size={t(15)} color={C.muted} />
      <Text style={{ color: C.text, fontSize: t(12), flex: 1 }} numberOfLines={1}>
        {titulo}
      </Text>
      {valor ? <Text style={{ color: C.dim, fontSize: t(10.5) }}>{valor}</Text> : null}
    </Pressable>
  );
}

interface BotonCapa {
  texto: string;
  onPress: () => void;
  principal?: boolean;
}

/** Estado a pantalla completa dentro de la carátula (reemplaza el contenido mientras dura). */
function Capa({
  k,
  tamano,
  icono,
  color = C.text,
  titulo,
  texto,
  botones,
}: {
  k: number;
  tamano: number;
  icono: Icono;
  color?: string;
  titulo: string;
  texto?: string;
  botones?: BotonCapa[];
}) {
  const t = (n: number) => n * k;
  return (
    <View style={[StyleSheet.absoluteFill, s.capa, { padding: tamano * 0.15, gap: t(6) }]}>
      <Ionicons name={icono} size={t(30)} color={color} />
      <Text style={{ color: C.text, fontSize: t(15), fontWeight: '600', textAlign: 'center' }}>{titulo}</Text>
      {texto ? (
        <Text style={{ color: C.muted, fontSize: t(11.5), textAlign: 'center', lineHeight: t(15) }} numberOfLines={3}>
          {texto}
        </Text>
      ) : null}
      {botones ? (
        <View style={{ flexDirection: 'row', gap: t(8), marginTop: t(8) }}>
          {botones.map((b) => (
            <Pressable
              key={b.texto}
              onPress={b.onPress}
              style={({ pressed }) => [
                s.pastilla,
                { paddingVertical: t(6), paddingHorizontal: t(16) },
                b.principal && { backgroundColor: C.text, borderColor: C.text },
                pressed && { opacity: 0.6 },
              ]}>
              <Text style={{ color: b.principal ? C.bg : C.text, fontSize: t(12), fontWeight: '600' }}>{b.texto}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  pantalla: { backgroundColor: '#000', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  estado: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  avisoBreve: { position: 'absolute', color: C.verde },
  etiqueta: { color: C.muted, fontWeight: '500', letterSpacing: 1, textTransform: 'uppercase' },
  codigo: { color: C.text, fontWeight: '500', fontVariant: ['tabular-nums'] },
  pequeno: { color: C.muted },
  distancia: { fontWeight: '300', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  pastilla: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, borderWidth: 1, borderColor: '#3A3B40' },
  opcion: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#17181B' },
  capa: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  puntos: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  corona: { position: 'absolute', backgroundColor: '#3A3B40' },
});
