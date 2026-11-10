// npm run reloj → arranca en una sola terminal:
//   1) el servidor que conecta el reloj con el teléfono (puerto 4000)
//   2) el smartwatch emulado en el navegador (puerto 8082)
// Ctrl + C detiene los dos.

const { spawn } = require('node:child_process');
const path = require('node:path');

const PUERTO_SERVIDOR = process.env.PUERTO ?? '4000';
const PUERTO_RELOJ = process.env.RELOJ_PUERTO ?? '8082';

// ---- Servidor (su salida va con el prefijo [servidor]) ----
const servidor = spawn(process.execPath, ['servidor.js'], {
  cwd: path.join(__dirname, 'servidor'),
  env: { ...process.env, PUERTO: PUERTO_SERVIDOR },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const mostrar = (datos) =>
  String(datos)
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .forEach((l) => {
      if (l.includes('EADDRINUSE')) {
        console.log(`[servidor] El puerto ${PUERTO_SERVIDOR} ya está en uso: seguramente ya hay un servidor abierto, se usará ese.`);
      } else if (!/^\s+at |node:internal|Emitted 'error'|^\s*[{}]|code:|errno|syscall|address:|port:|Node\.js v/.test(l)) {
        console.log(`[servidor] ${l}`);
      }
    });
servidor.stdout.on('data', mostrar);
servidor.stderr.on('data', mostrar);

// ---- Reloj (Expo web, conserva la terminal interactiva) ----
const reloj = spawn(`npx expo start --web --port ${Number(PUERTO_RELOJ)}`, {
  cwd: path.join(__dirname, 'reloj'),
  stdio: 'inherit',
  shell: true,
});

let cerrando = false;
function cerrar() {
  if (cerrando) return;
  cerrando = true;
  servidor.kill();
  reloj.kill();
  setTimeout(() => process.exit(0), 300);
}
reloj.on('exit', cerrar);
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
