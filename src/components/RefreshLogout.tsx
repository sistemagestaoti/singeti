"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export function RefreshLogout() {
  useEffect(() => {
    // A verificação de 'reload' nativa via performance API é global para o documento SPA.
    // Se o usuário desse F5 na tela de login e logasse, o SPA lembrava do reload e deslogava.
    // Para limpar sessão no reload adequadamente, a melhor abordagem é usar cookies de sessão (sem Max-Age)
    // ou controlar isso via server-side/middleware.
  }, []);

  return null;
}
