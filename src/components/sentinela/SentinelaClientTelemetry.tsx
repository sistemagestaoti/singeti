"use client";

import { useEffect, useRef } from "react";

/**
 * Coletor de Telemetria Frontend do SYNGETI SENTINELA IA
 * Monitora silenciosamente erros JavaScript e falhas de rede no navegador.
 */
export function SentinelaClientTelemetry() {
  const reportedErrorsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const reportError = (msg: string, source: string, details?: any) => {
      const key = `${msg}_${source}`;
      // Deduplicação: não reporta o mesmo erro repetidamente na mesma sessão
      if (reportedErrorsRef.current.has(key)) return;
      reportedErrorsRef.current.add(key);

      try {
        fetch("/api/sentinela/telemetry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "frontend",
            eventType: "error",
            message: msg.slice(0, 300),
            details: {
              source,
              url: window.location.pathname,
              userAgent: navigator.userAgent,
              ...details,
            },
          }),
        }).catch(() => {});
      } catch {}
    };

    const handleError = (e: ErrorEvent) => {
      // Ignora erros de extensões de navegador de terceiros
      if (e.filename && (e.filename.includes("chrome-extension://") || e.filename.includes("moz-extension://"))) {
        return;
      }
      reportError(e.message || "Erro JavaScript não tratado", "window.onerror", {
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
      });
    };

    const handleRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason?.message || String(e.reason || "Promise rejeitada");
      // Ignora cancelamentos intencionais de fetch ou fechamento de canal de extensões
      if (reason.includes("message channel closed") || reason.includes("AbortError")) {
        return;
      }
      reportError(reason, "window.unhandledrejection", {
        stack: e.reason?.stack,
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
