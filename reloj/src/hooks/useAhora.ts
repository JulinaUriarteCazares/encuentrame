import { useEffect, useState } from 'react';

/** Devuelve la hora actual y se actualiza cada `cadaMs` (para textos tipo "hace 5 s"). */
export function useAhora(cadaMs = 1000): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), cadaMs);
    return () => clearInterval(t);
  }, [cadaMs]);
  return ahora;
}
