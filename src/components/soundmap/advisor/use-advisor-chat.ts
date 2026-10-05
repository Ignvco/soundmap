import { accessToken } from "@/lib/cloud-session";
// AI System Advisor chat hook — streams responses from the Convex HTTP action.
import { buildAdvisorContext } from "@/lib/audio/advisor-context.ts";
import { buildOfflineAdvisorReply } from "@/lib/audio/offline-advisor.ts";
import { feedback } from "@/lib/feedback.ts";
import { useAppStore } from "@/store/app.ts";
import { useCallback, useEffect, useRef, useState } from "react";

export interface AdvisorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL as string | undefined;

export function useAdvisorChat() {
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Pull a fresh snapshot lazily so context reflects the latest state at send time.
  const send = useCallback(
    async (text: string) => {
      const prompt = text.trim();
      if (!prompt || isStreaming) return;
      setError(null);

      const userMsg: AdvisorMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: prompt,
      };
      const assistantId = `a-${Date.now()}`;
      const history = [...messages, userMsg];

      setMessages([
        ...history,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setIsStreaming(true);

      const state = useAppStore.getState();
      const context = buildAdvisorContext(state).slice(0, 12000);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const token = await accessToken();
        if (!SITE_URL || !token)
          throw new Error(
            "Sin conexión remota autenticada; respuesta mediante reglas locales",
          );
        const res = await fetch(`${SITE_URL}/advisor-stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            context,
            messages: history
              .slice(-12)
              .map((m) => ({
                role: m.role,
                content: m.content.slice(0, 4000),
              })),
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`Servicio remoto no disponible (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: acc } : m,
            ),
          );
        }

        if (acc.trim())
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "**Origen: asesor remoto.**\n\n" + acc }
                : m,
            ),
          );
        if (!acc.trim()) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "No recibí respuesta. Intentá de nuevo." }
                : m,
            ),
          );
        }
      } catch (err) {
        if (
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === "AbortError")
        ) {
          // User stopped the stream — keep whatever was generated.
        } else {
          // Fallback: give heuristic offline recommendations instead of dying.
          const offlineReply =
            "**Origen: reglas locales de SoundMap; no es una respuesta del servicio de IA.**\n\n" +
            buildOfflineAdvisorReply(state, { question: prompt });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: offlineReply } : m,
            ),
          );
          feedback("warning", { sound: false });
          const message =
            err instanceof Error ? err.message : "Error inesperado";
          setError(`Modo offline: ${message}`);
        }
      } finally {
        if (abortRef.current === controller) {
          setIsStreaming(false);
          abortRef.current = null;
        }
      }
    },
    [messages, isStreaming],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isStreaming, error, send, stop, reset };
}
