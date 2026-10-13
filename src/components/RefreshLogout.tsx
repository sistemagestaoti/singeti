"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export function RefreshLogout() {
  useEffect(() => {
    // 1. Verifica se a aba possui uma sessão válida ativa
    const sessionActive = sessionStorage.getItem("syngeti_session_active");
    
    if (!sessionActive) {
      // Se a aba foi aberta do zero ou fechada anteriormente, encerra a sessão
      signOut({ callbackUrl: '/login' });
      return;
    }

    // 2. Detecta se a ação atual foi um recarregamento manual (F5 / Refresh)
    try {
      const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      const isReload = (navEntries.length > 0 && navEntries[0].type === "reload") || 
                       ((performance as any).navigation?.type === 1);
      
      if (isReload) {
        sessionStorage.removeItem("syngeti_session_active");
        signOut({ callbackUrl: '/login' });
      }
    } catch (e) {
      // Ignora erro de leitura de performance
    }
  }, []);

  return null;
}
