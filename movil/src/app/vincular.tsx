import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { CodigoInput } from '@/components/CodigoInput';
import { EditorPerfil } from '@/components/EditorPerfil';
import { EscanerQR } from '@/components/EscanerQR';
import { Boton, Pantalla, Tarjeta } from '@/components/ui';
import { useEncuentrame, type PerfilNuevo } from '@/store/useEncuentrame';
import { C, COLORES_DISPOSITIVO, RADIO } from '@/theme';

type Paso = 'codigo' | 'perfil';

export default function Vincular() {
  const router = useRouter();
  const cantidad = useEncuentrame((s) => Object.keys(s.dispositivos).length);
  const vinculacion = useEncuentrame((s) => s.vinculacion);
  const vincular = useEncuentrame((s) => s.vincular);
  const reiniciar = useEncuentrame((s) => s.reiniciarVinculacion);
  const nuevo = useEncuentrame((s) => (s.vinculacion.estado === 'listo' ? s.dispositivos[s.vinculacion.id] : undefined));

  const [paso, setPaso] = useState<Paso>('codigo');
  const [codigo, setCodigo] = useState('');
  const [escaner, setEscaner] = useState(false);
  const [perfil, setPerfil] = useState<PerfilNuevo>(() => ({
    nombre: '',
    emoji: '🧒',
    color: COLORES_DISPOSITIVO[cantidad % COLORES_DISPOSITIVO.length],
    zona: 20,
  }));

  useEffect(() => {
    reiniciar();
    return () => reiniciar();
  }, [reiniciar]);

  const cerrar = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // ---- Éxito ----
  if (vinculacion.estado === 'listo' && nuevo) {
    return (
      <Pantalla>
        <View style={styles.exito}>
          <View>
            <Avatar nombre={nuevo.nombre} color={nuevo.color} tamano={96} />
            <View style={styles.check}>
              <Ionicons name="checkmark" size={26} color="#0B1120" />
            </View>
          </View>
          <Text style={styles.titulo}>{nuevo.nombre} está vinculado</Text>
          <Text style={styles.texto}>
            Su reloj ya comparte su ubicación contigo y tiene una flecha para regresar contigo.
          </Text>
          <Boton
            texto={`Buscar a ${nuevo.nombre}`}
            icono="navigate"
            onPress={() => router.replace({ pathname: '/buscar/[id]', params: { id: nuevo.id } })}
            style={{ alignSelf: 'stretch' }}
          />
          <Boton texto="Listo" variante="secundario" onPress={cerrar} style={{ alignSelf: 'stretch' }} />
        </View>
      </Pantalla>
    );
  }

  // ---- Paso 2: perfil ----
  if (paso === 'perfil') {
    const enviando = vinculacion.estado === 'enviando';
    return (
      <Pantalla>
        <Pasos actual={2} />
        <Tarjeta>
          <EditorPerfil perfil={perfil} onCambio={setPerfil} />
        </Tarjeta>
        {vinculacion.estado === 'error' ? (
          <View style={styles.error}>
            <Ionicons name="alert-circle" size={20} color={C.rojo} />
            <Text style={styles.errorTexto}>{vinculacion.mensaje}</Text>
          </View>
        ) : null}
        <Boton
          texto={enviando ? 'Vinculando…' : 'Vincular'}
          icono="link"
          cargando={enviando}
          deshabilitado={!perfil.nombre.trim()}
          onPress={() => vincular(codigo, { ...perfil, nombre: perfil.nombre.trim() })}
        />
        <Boton
          texto="Cambiar código"
          variante="fantasma"
          onPress={() => {
            reiniciar();
            setPaso('codigo');
          }}
        />
      </Pantalla>
    );
  }

  // ---- Paso 1: código ----
  return (
    <Pantalla>
      <Pasos actual={1} />
      <Tarjeta style={{ alignItems: 'center', gap: 18, paddingVertical: 24 }}>
        <View style={styles.relojIcono}>
          <Ionicons name="watch-outline" size={34} color={C.muted} />
        </View>
        <Text style={styles.titulo}>Abre Encuéntrame Reloj</Text>
        <Text style={styles.texto}>Escribe el código de 6 dígitos que aparece en su pantalla.</Text>
        <CodigoInput valor={codigo} onCambio={setCodigo} />
        <Boton
          texto="Continuar"
          icono="arrow-forward"
          deshabilitado={codigo.length !== 6}
          onPress={() => setPaso('perfil')}
          style={{ alignSelf: 'stretch' }}
        />
        <View style={styles.separador}>
          <View style={styles.linea} />
          <Text style={styles.o}>o</Text>
          <View style={styles.linea} />
        </View>
        <Boton texto="Escanear su código QR" icono="qr-code-outline" variante="secundario" onPress={() => setEscaner(true)} style={{ alignSelf: 'stretch' }} />
      </Tarjeta>

      <EscanerQR
        visible={escaner}
        onCerrar={() => setEscaner(false)}
        onCodigo={(c) => {
          setCodigo(c);
          setPaso('perfil');
        }}
      />
    </Pantalla>
  );
}

function Pasos({ actual }: { actual: 1 | 2 }) {
  return (
    <View style={styles.pasos}>
      {['Código', 'Perfil'].map((p, i) => {
        const activo = i + 1 <= actual;
        return (
          <View key={p} style={styles.paso}>
            <View style={[styles.pasoBola, activo && { backgroundColor: C.ambar, borderColor: C.ambar }]}>
              <Text style={[styles.pasoNumero, activo && { color: C.bg }]}>{i + 1}</Text>
            </View>
            <Text style={[styles.pasoTexto, activo && { color: C.text }]}>{p}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: { color: C.text, fontSize: 20, fontWeight: '600', textAlign: 'center' },
  texto: { color: C.muted, fontSize: 14.5, lineHeight: 21, textAlign: 'center' },
  relojIcono: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.ambarSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separador: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  linea: { flex: 1, height: 1, backgroundColor: C.border },
  o: { color: C.dim, fontSize: 13 },
  error: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: C.rojoSuave,
    borderRadius: RADIO.md,
    padding: 12,
  },
  errorTexto: { color: C.text, fontSize: 13.5, flex: 1 },
  exito: { alignItems: 'center', gap: 18, paddingTop: 40 },
  check: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.verde,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: C.bg,
  },
  pasos: { flexDirection: 'row', justifyContent: 'center', gap: 28 },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pasoBola: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: C.borderFuerte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasoNumero: { color: C.muted, fontWeight: '600', fontSize: 13 },
  pasoTexto: { color: C.dim, fontWeight: '700', fontSize: 13 },
});
