import { useCallback, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";

/**
 * Ejecuta load() cuando:
 * - la pantalla entra por primera vez
 * - la pantalla vuelve a enfocarse (cambio de tab / volver atrás)
 */
export function useReloadOnFocus(load: () => void | Promise<void>) {
  const loadCb = useCallback(() => {
    void Promise.resolve(load());
  }, [load]);

  // 1) primera carga
  useEffect(() => {
    loadCb();
  }, [loadCb]);

  // 2) cada vez que vuelve a enfocarse
  useFocusEffect(loadCb);
}
