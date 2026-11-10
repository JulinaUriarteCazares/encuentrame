import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { FiltroGPS, PRECISION_UTIL, suavizarRumbo } from '@/lib/filtroGps';
import { desplazar } from '@/lib/geo';
import { guardianActivo, useReloj } from '@/store/useReloj';

/** Punto de partida si todavía no se conoce la ubicación de ningún teléfono (Zócalo, CDMX). */
const BASE_DEMO = { lat: 19.4326, lon: -99.1332 };
/** En "modo paseo" el niño no se aleja más de esto del punto de partida. */
const RANGO_PASEO = 110;
const TICK_MS = 500;

/** Batería, ubicación (real o simulada) y brújula del reloj. */
export function useSensores() {
  const listo = useReloj((s) => s.listo);
  const modo = useReloj((s) => s.modo);

  // ---- Batería ----
  useEffect(() => {
    if (!listo) return;
    let sub: { remove(): void } | null = null;
    let cancelado = false;
    (async () => {
      try {
        const nivel = await Battery.getBatteryLevelAsync();
        if (cancelado) return;
        useReloj.getState().setBateria(nivel >= 0 ? nivel : null);
        sub = Battery.addBatteryLevelListener(({ batteryLevel }) =>
          useReloj.getState().setBateria(batteryLevel >= 0 ? batteryLevel : null),
        );
      } catch {
        // sin información de batería (algunos navegadores)
      }
    })();
    return () => {
      cancelado = true;
      sub?.remove();
    };
  }, [listo]);

  // ---- Ubicación simulada (emulador) ----
  useEffect(() => {
    if (!listo || modo !== 'simulada') return;
    useReloj.getState().setRumboBrujula(null);
    let direccion = Math.random() * 360;
    const tick = () => {
      const s = useReloj.getState();
      let { este, norte } = s.offset;
      if (s.paseo) {
        // Caminata aleatoria a ~1.4 m/s que regresa si se aleja demasiado.
        const lejos = Math.hypot(este, norte) > RANGO_PASEO;
        direccion = lejos
          ? (Math.atan2(-este, -norte) * 180) / Math.PI + (Math.random() - 0.5) * 40
          : direccion + (Math.random() - 0.5) * 40;
        const paso = 1.4 * (TICK_MS / 1000);
        este += Math.sin((direccion * Math.PI) / 180) * paso;
        norte += Math.cos((direccion * Math.PI) / 180) * paso;
        s.setOffset({ este: Math.round(este * 10) / 10, norte: Math.round(norte * 10) / 10 });
        s.setRumboSimulado(direccion); // el niño mira hacia donde camina
      }
      const ancla = s.ancla ?? guardianActivo(s)?.ubicacion ?? BASE_DEMO;
      const p = desplazar(ancla, este, norte);
      s.actualizarMiUbicacion({ lat: p.lat, lon: p.lon, precision: 4, ts: Date.now() });
    };
    tick();
    const t = setInterval(tick, TICK_MS);
    return () => clearInterval(t);
  }, [listo, modo]);

  // ---- Ubicación fija (calibrada con el GPS del teléfono) ----
  const posicionFija = useReloj((s) => s.posicionFija);
  useEffect(() => {
    if (!listo || modo !== 'fija' || !posicionFija) return;
    const emitir = () =>
      useReloj.getState().actualizarMiUbicacion({
        lat: posicionFija.lat,
        lon: posicionFija.lon,
        precision: posicionFija.precision ?? 5,
        ts: Date.now(),
      });
    emitir();
    const t = setInterval(emitir, 2000);
    return () => clearInterval(t);
  }, [listo, modo, posicionFija]);

  // ---- Ubicación y brújula reales ----
  useEffect(() => {
    if (!listo || modo !== 'real') return;
    const { actualizarMiUbicacion, setRumboBrujula, setGpsImpreciso } = useReloj.getState();
    let cancelado = false;
    const subs: { remove(): void }[] = [];
    const web = Platform.OS === 'web';
    let ultimaBuena = 0;

    // Una PC no tiene GPS: el navegador la ubica por internet y puede equivocarse por miles de km.
    // Mientras no llegue una lectura buena, el reloj usa el punto calibrado con el teléfono (la PC no se mueve).
    const usarPuntoCalibrado = () => {
      const fija = useReloj.getState().posicionFija;
      if (web && fija && Date.now() - ultimaBuena > 8000) {
        actualizarMiUbicacion({ lat: fija.lat, lon: fija.lon, precision: fija.precision ?? 5, ts: Date.now() });
      }
    };
    usarPuntoCalibrado();
    const respaldo = setInterval(usarPuntoCalibrado, 2000);
    const guardarSub = (s: { remove(): void }) => (cancelado ? s.remove() : subs.push(s));
    // Promedia el GPS (más precisión) y suaviza la brújula (menos temblor).
    const filtro = new FiltroGPS();
    let rumbo: number | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelado || status !== 'granted') return;
        guardarSub(
          await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
            (l) => {
              const precision = l.coords.accuracy;
              // Con un punto calibrado, en la PC solo una lectura muy precisa lo reemplaza.
              const maxima = web && useReloj.getState().posicionFija ? 20 : PRECISION_UTIL;
              if (precision != null && precision > maxima) {
                setGpsImpreciso(Math.round(precision));
                return;
              }
              ultimaBuena = Date.now();
              setGpsImpreciso(null);
              actualizarMiUbicacion(filtro.agregar({ lat: l.coords.latitude, lon: l.coords.longitude, precision, ts: l.timestamp }));
            },
          ),
        );
        if (Platform.OS !== 'web') {
          guardarSub(
            await Location.watchHeadingAsync((h) => {
              const r = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
              if (r < 0) return;
              const suave = suavizarRumbo(rumbo, r);
              if (rumbo == null || Math.abs(suave - rumbo) >= 1) setRumboBrujula(Math.round(suave));
              rumbo = suave;
            }),
          );
        }
      } catch {
        // sin GPS: se queda sin ubicación
      }
    })();

    return () => {
      cancelado = true;
      clearInterval(respaldo);
      subs.forEach((s) => s.remove());
    };
  }, [listo, modo]);
}
