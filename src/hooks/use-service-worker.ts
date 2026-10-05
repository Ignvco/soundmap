import { audioSessionActive } from "@/lib/audio/audio-session";
import { flushPersistence } from "@/lib/persistence";
import { Capacitor } from "@capacitor/core";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function useServiceWorker() {
  const toastShown = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;

    // En Android/iOS (Capacitor) el bundle YA viene empaquetado en el APK y lo
    // sirve el bridge local, así que un service worker no aporta offline —
    // sólo agrega una capa de caché que puede servir assets viejos después de
    // actualizar la app desde la tienda. Y el toast "hay una nueva versión" no
    // tiene sentido ahí: las actualizaciones llegan por Play Store.
    if (Capacitor.isNativePlatform()) return;

    // El SW nuevo espera en `waiting` hasta que el usuario acepta. Recargar sin
    // más dejaba al SW viejo al mando y el toast reaparecía en cada carga.
    const activateAndReload = async (
      registration: ServiceWorkerRegistration,
    ) => {
      if (audioSessionActive()) {
        toast.info("Detén y guarda la medición antes de actualizar.");
        return;
      }
      try {
        await flushPersistence();
      } catch (e) {
        toast.error((e as Error).message);
        return;
      }
      const waiting = registration.waiting;
      if (!waiting) {
        window.location.reload();
        return;
      }
      // Recargar recién cuando el SW nuevo tomó el control.
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => window.location.reload(),
        { once: true },
      );
      waiting.postMessage({ type: "SKIP_WAITING" });
    };

    const showUpdateToast = (registration: ServiceWorkerRegistration) => {
      if (toastShown.current) return;
      toastShown.current = true;
      toast("Hay una nueva versión de SoundMap", {
        description: "Actualizá para aplicar los cambios.",
        duration: Infinity,
        action: {
          label: "Actualizar",
          onClick: () => activateAndReload(registration),
        },
      });
    };

    const onStatus = (event: MessageEvent) => {
      if (event.data?.type === "OFFLINE_READY")
        toast.success("Pantallas y herramientas listas sin conexión", {
          id: "offline-ready",
        });
    };
    navigator.serviceWorker.addEventListener("message", onStatus);
    navigator.serviceWorker.ready.then((r) =>
      r.active?.postMessage({ type: "STATUS" }),
    );
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (registration.waiting) {
          showUpdateToast(registration);
          return;
        }
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            // `controller` presente = ya había un SW: esto es una ACTUALIZACIÓN,
            // no la primera instalación (donde el toast sería absurdo).
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              showUpdateToast(registration);
            }
          });
        });
      })
      .catch(() =>
        toast.warning(
          "La descarga sin conexión no se completó. Reintenta con conexión.",
        ),
      );
    return () =>
      navigator.serviceWorker.removeEventListener("message", onStatus);
  }, []);
}
