# Encuéntrame

**Ámbito social.** En una fiesta, un concierto o un centro comercial es fácil perder de vista a un niño.
Con Encuéntrame vinculas su smartwatch a tu teléfono y **los dos se apuntan con una flecha**: tú sigues la
flecha del teléfono hasta el reloj y el niño sigue la flecha del reloj hasta ti. Si se separan más de la
distancia elegida (5 a 100 m), los dos reciben una alerta. Cada uno puede **hacer sonar** al otro y el reloj
tiene botón **SOS**.

Son **dos apps separadas** y un servidor pequeño que las conecta:

```
 Teléfono (Expo Go)  <── WebSocket ──>  Servidor (Node + ws)  <── WebSocket ──>  Reloj (Expo, emulado en el navegador)
 GPS + brújula                          en tu PC, puerto 4000                     ubicación del navegador / GPS
```

| Carpeta | Qué es |
|---|---|
| `movil/` | App del teléfono (Expo SDK 58, Expo Router). Se abre con Expo Go. |
| `reloj/` | App del smartwatch (otro proyecto Expo). En la PC se abre en el navegador y solo se ve el reloj. |
| `servidor/` | Puente en tiempo real (Node.js + `ws`): vinculación por código, ubicaciones, comandos y SOS. |

## Cómo correrlo

Requisitos: Node.js, Expo Go en el Android y **el teléfono y la PC en la misma red Wi‑Fi**.
Dos terminales dentro de `Encuentrame/`:

```bash
npm run reloj      # el reloj + el servidor → http://localhost:8082
npm run movil      # la app del teléfono → escanea el QR con Expo Go
```

La primera vez Windows puede preguntar si Node.js puede usar la red: *Permitir en redes privadas*.

## Qué hace

**Teléfono**
- Lista de relojes vinculados con batería, distancia y una mini flecha.
- Pantalla de búsqueda: brújula con flecha, distancia, cercanía, *Hacer sonar* y *Lo encontré*.
- Radar con todos los relojes alrededor.
- Distancia máxima de 5 a 100 m (barra, − / + o atajos).
- *Calibrar juntos* para corregir el error del GPS entre los dos.
- Suena cuando el reloj lo busca y muestra la alerta SOS.

**Reloj**
- Pantalla principal: flecha que siempre apunta al teléfono, distancia y *Sonar teléfono*.
- SOS (mantener presionado 2 s).
- Ajustes: ubicación, sonido y vincular otro teléfono.
- Avisos de “Te alejaste”, “Te están buscando” y “Te encontró”.

Manejo del reloj en el navegador: deslizar con el mouse, tocar la corona o las teclas ← →.
El botón lateral vuelve a la flecha. `?reloj=2` abre un segundo reloj; `?panel=1` abre un panel de pruebas.

## Ubicación y comunicación

No se usa ninguna API externa ni claves (no hay Google Maps).

- **Ubicación del teléfono:** `expo-location` → `watchPositionAsync` (GPS) y `watchHeadingAsync` (brújula).
- **Ubicación del reloj en la PC:** la del navegador (`navigator.geolocation`), que es aproximada; por eso
  existe *Calibrar juntos*: el teléfono promedia su GPS 5 s y el reloj queda fijo en ese punto.
- **Orientación del reloj en la PC:** la PC no tiene brújula. Al calibrar, el teléfono va acostado junto a la
  pantalla apuntando hacia ella y le pasa su brújula al reloj; así "arriba" en el reloj es hacia donde mira la
  pantalla y la flecha apunta de verdad al teléfono.
- **Distancia y dirección:** se calculan en el propio dispositivo (`src/lib/geo.ts`) con la fórmula de
  haversine y el rumbo inicial. La flecha = rumbo hacia el otro − hacia dónde apunta el dispositivo.
- **Precisión:** `src/lib/filtroGps.ts` promedia lecturas según su precisión y la brújula se suaviza.
- **Comunicación:** WebSocket con el servidor propio (`servidor/servidor.js`), que solo reenvía datos
  entre dispositivos vinculados y no guarda ubicaciones.

## Pruebas

```bash
npm run prueba     # prueba del servidor
```

En cada app: `npx tsc --noEmit` y `npx expo lint`.

Nota: `src/lib/*`, `src/theme.ts` y los componentes `ui`, `Avatar`, `Logo` y `Fondo` deben ser iguales en
`movil/` y `reloj/`.
