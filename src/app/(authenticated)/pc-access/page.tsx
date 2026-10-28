import { Metadata } from "next";
import { Suspense } from "react";
import { PCAccessClient } from "@/components/pc-access/PCAccessClient";

export const metadata: Metadata = {
  title: "Gestão de Acessos a PCs | Syngeti ERP",
  description: "Central de computadores, inventário de TI, contas de acesso Windows/domínio e cofre seguro de credenciais.",
};

export default function PCAccessPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground">Carregando Gestão de Acessos a PCs...</div>}>
      <PCAccessClient />
    </Suspense>
  );
}
