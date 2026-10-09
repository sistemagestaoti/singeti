import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import BrandingClient from "./BrandingClient";
import { getBranding } from "@/lib/branding";

export default async function BrandingSettingsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect("/dashboard");
  }

  const initialData = getBranding();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-5xl mx-auto w-full">
      <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
        <h2 className="text-2xl font-bold text-foreground">Identidade Visual do SYNGETI</h2>
        <p className="text-sm text-muted-foreground mt-1">Gerencie os logotipos, ícones e imagem de fundo da plataforma.</p>
      </div>

      <BrandingClient initialData={initialData} />
    </div>
  );
}
