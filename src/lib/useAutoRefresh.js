import { useEffect, useRef, useState } from "react";

/**
 * useAutoRefresh — corre `loadFn` cada `intervalMs` ms y devuelve estado
 * para mostrar feedback visual.
 *
 * Comportamiento:
 *  - Pausa cuando la pestaña no está visible (Page Visibility API).
 *  - Al volver a estar visible, dispara un refetch inmediato.
 *  - Se desactiva con `enabled=false` (típico: encuesta cerrada → no llegan
 *    más respuestas, dejar de pollear).
 *  - El primer fetch lo hace el caller en su useEffect; este hook solo
 *    gestiona los refetches periódicos.
 *
 * loadFn() debe ser async y manejar sus propios errores. Si tira, el hook
 * lo cachea en silencio y limpia el flag de isRefreshing.
 */
export function useAutoRefresh(loadFn, { intervalMs = 30000, enabled = true } = {}) {
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const loadFnRef = useRef(loadFn);
  useEffect(() => { loadFnRef.current = loadFn; }, [loadFn]);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    const tick = async () => {
      if (document.hidden) return;
      setIsRefreshing(true);
      try {
        await loadFnRef.current();
        if (!cancelled) setLastUpdate(new Date());
      } catch {
        // errores los maneja loadFn
      } finally {
        if (!cancelled) setIsRefreshing(false);
      }
    };

    const timer = setInterval(tick, intervalMs);
    const onVisibilityChange = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, intervalMs]);

  return { lastUpdate, isRefreshing };
}
