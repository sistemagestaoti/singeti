import { redirect } from "next/navigation";

export default function HomePage() {
  // Redireciona a raiz do site direto para o painel principal
  // O sistema de autenticação (NextAuth) cuidará de jogar para o /login caso não esteja logado
  redirect("/dashboard");
}
