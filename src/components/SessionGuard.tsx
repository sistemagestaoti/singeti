"use client";

import { useEffect, useState, useRef } from "react";
import { signOut } from "next-auth/react";

/**
 * SessionGuard - Regra Mandatória de Segurança SYNGETI:
 * Toda vez que o usuário der um F5, atualizar a página ou fechar o navegador,
 * a sessão é encerrada e ele retorna para a tela de login (/login).
 */
export function SessionGuard() {
  const [redirecting, setRedirecting] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    if (typeof window === "undefined") return;

    let isReload = false;
    try {
      const navEntries = performance.getEntriesByType("navigation");
      if (navEntries.length > 0) {
        const nav = navEntries[0] as PerformanceNavigationTiming;
        if (nav.type === "reload") {
          isReload = true;
        }
      } else if ((window.performance as any)?.navigation?.type === 1) {
        isReload = true;
      }
    } catch (e) {
      console.warn("Aviso ao verificar navegação:", e);
    }

    // Verifica se a sessão ativa da aba existe no sessionStorage (é destruído ao fechar o navegador)
    const sessionActive = sessionStorage.getItem("syngeti_session_active");
    const loginTimeRaw = sessionStorage.getItem("syngeti_login_time");
    const loginTime = loginTimeRaw ? Number(loginTimeRaw) : 0;

    // IMPORTANTE: Se o usuário acabou de realizar login (nos últimos 12 segundos),
    // uma entrada antiga "reload" do PerformanceNavigationTiming de quando ele deu F5
    // na tela de /login ANTES de autenticar NÃO deve derrubar a sessão recém-criada.
    // Caso o usuário dê F5 já dentro do sistema, o navegador recarrega o documento e
    // analisamos se a página foi recarregada após o login.
    const justLoggedIn = sessionActive === "true" && loginTime > 0 && Date.now() - loginTime < 12000;
    const loginJustConsumed = sessionStorage.getItem("syngeti_login_entry_consumed") === "true";

    if (justLoggedIn && !loginJustConsumed) {
      // Marca que a entrada pós-login no painel já ocorreu via SPA.
      // Se o usuário der F5 mesmo 1 segundo depois de entrar, na próxima montagem
      // "syngeti_login_entry_consumed" já será "true" e o F5 encerrará a sessão imediatamente!
      sessionStorage.setItem("syngeti_login_entry_consumed", "true");
      return;
    }

    if (isReload || !sessionActive) {
      setRedirecting(true);
      sessionStorage.removeItem("syngeti_session_active");
      sessionStorage.removeItem("syngeti_login_time");
      sessionStorage.removeItem("syngeti_login_entry_consumed");

      // Encerra a sessão NextAuth e redireciona de volta para a tela de login
      signOut({ redirect: false }).finally(() => {
        window.location.replace("/login");
      });
      return;
    }
  }, []);

  if (redirecting) {
    return (
      <div className="fixed inset-0 z-[99999] bg-[#050D1B] flex flex-col items-center justify-center text-foreground select-none">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm text-muted-foreground font-medium">Sessão finalizada. Redirecionando para o login...</p>
      </div>
    );
  }

  return null;
}
