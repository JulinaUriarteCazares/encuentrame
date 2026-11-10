import * as Location from 'expo-location';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { FiltroGPS, suavizarRumbo } from '@/lib/filtroGps';
import { useEncuentrame } from '@/store/useEncuentrame';

/** Sigue la ubicación GPS y la brújula del teléfono y las manda al servidor. */
export function useSeguimiento() {
  const listo = useEncuentrame((s) => s.listo);

  useEffect(() => {
    if (!listo) return;
    const { actualizarMiUbicacion, actualizarMiRumbo, setPermisoUbicacion } = useEncuentrame.getState();
    let cancelado = false;
    const subs: { remove(): void }[] = [];
    // Promedia las lecturas del GPS (más precisión) y suaviza la brújula (menos temblor).
    const filtro = new FiltroGPS();
    let rumbo: number | null = null;
    const nuevaLectura = (lat: number, lon: number, precision: number | null, ts: number) =>
      actualizarMiUbicacion(filtro.agregar({ lat, lon, precision, ts }));

    const guardarSub = (s: { remove(): void }) => {
      if (cancelado) s.remove();
      else subs.push(s);
    };

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelado) return;
        setPermisoUbicacion(status === 'granted' ? 'concedido' : 'denegado');
        if (status !== 'granted') return;
        // Última ubicación conocida solo si es reciente y buena (una vieja puede ser de otro lugar).
        const ultima = await Location.getLastKnownPositionAsync({ maxAge: 60_000, requiredAccuracy: 50 }).catch(() => null);
        if (ultima && !cancelado) {
          nuevaLectura(ultima.coords.latitude, ultima.coords.longitude, ultima.coords.accuracy, ultima.timestamp);
        }
        guardarSub(
          await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
            (l) => nuevaLectura(l.coords.latitude, l.coords.longitude, l.coords.accuracy, l.timestamp),
          ),
        );
      } catch {
        setPermisoUbicacion('denegado');
      }

      // Brújula: solo existe en el teléfono (en web la flecha se orienta al norte).
      if (Platform.OS !== 'web') {
        try {
          guardarSub(
            await Location.watchHeadingAsync((h) => {
              const r = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
              if (r < 0) return;
              const suave = suavizarRumbo(rumbo, r);
              // Solo se actualiza si cambió al menos 1° (menos trabajo para la pantalla).
              if (rumbo == null || Math.abs(suave - rumbo) >= 1) actualizarMiRumbo(Math.round(suave));
              rumbo = suave;
            }),
          );
        } catch {
          actualizarMiRumbo(null);
        }
      }
    })();

    return () => {
      cancelado = true;
      subs.forEach((s) => s.remove());
    };
  }, [listo]);
}
