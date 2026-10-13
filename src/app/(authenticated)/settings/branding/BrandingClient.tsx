"use client";

import { useState } from "react";
import { Upload, RefreshCcw, Save, X, Image as ImageIcon, Layout, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type AssetType = 'loginLogo' | 'appLogo' | 'appIcon' | 'favicon' | 'loginBackground';

interface BrandingData {
  loginLogo: string | null;
  appLogo: string | null;
  appIcon: string | null;
  favicon: string | null;
  loginBackground: string | null;
}

export default function BrandingClient({ initialData }: { initialData: BrandingData }) {
  const router = useRouter();
  const [data, setData] = useState<BrandingData>(initialData);
  const [loading, setLoading] = useState<AssetType | null>(null);

  const handleUpload = async (type: AssetType, file: File) => {
    if (!confirm(`Deseja substituir o ativo visual de ${type}?`)) return;
    
    setLoading(type);
    const formData = new FormData();
    formData.append("action", "upload");
    formData.append("type", type);
    formData.append("file", file);

    try {
      const res = await fetch("/api/branding", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (res.ok) {
        setData({ ...data, [type]: result.url });
        alert("Imagem substituída com sucesso!");
        router.refresh();
      } else {
        alert(result.error || "Erro ao fazer upload");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de comunicação com o servidor.");
    } finally {
      setLoading(null);
    }
  };

  const handleRestore = async (type: AssetType) => {
    if (!confirm("Deseja restaurar o padrão original para este ativo? A imagem atual será removida permanentemente.")) return;
    
    setLoading(type);
    const formData = new FormData();
    formData.append("action", "restore");
    formData.append("type", type);

    try {
      const res = await fetch("/api/branding", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setData({ ...data, [type]: null });
        alert("Padrão restaurado com sucesso!");
        router.refresh();
      } else {
        alert("Erro ao restaurar padrão");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const AssetUploader = ({ 
    title, 
    badge,
    desc, 
    type, 
    aspectClass, 
    bgClass = "bg-[#050D1B]" 
  }: { 
    title: string;
    badge?: string;
    desc: string; 
    type: AssetType; 
    aspectClass: string; 
    bgClass?: string;
  }) => {
    const url = data[type];
    const isLoading = loading === type;

    return (
      <div className="bg-surface border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
        <div className="mb-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-bold text-foreground text-base">{title}</h3>
            {badge && (
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
        </div>

        <div className={`w-full ${aspectClass} ${bgClass} rounded-lg border border-border/60 flex items-center justify-center overflow-hidden relative mb-4 p-3`}>
          {url ? (
            <img src={url} alt={title} className="object-contain w-full h-full" />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground opacity-60">
              <ImageIcon className="w-8 h-8 mb-1.5" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Padrão do Sistema</span>
            </div>
          )}
        </div>

        <div className="mt-auto flex gap-2">
          <label className="flex-1">
            <span className={`block w-full text-center py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              isLoading 
                ? 'bg-muted text-muted-foreground border-transparent opacity-50 cursor-not-allowed' 
                : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
            }`}>
              {isLoading ? "Processando..." : (url ? "Substituir Imagem" : "Importar Imagem")}
            </span>
            <input 
              type="file" 
              accept=".png,.jpg,.jpeg,.svg,.webp,.ico" 
              className="hidden" 
              disabled={isLoading}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleUpload(type, e.target.files[0]);
                }
              }} 
            />
          </label>
          {url && (
            <button 
              onClick={() => handleRestore(type)}
              disabled={isLoading}
              className="px-3 py-2 rounded-lg border border-danger/20 text-danger hover:bg-danger/10 transition-colors flex items-center justify-center"
              title="Restaurar Imagem Padrão"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      {/* SEÇÃO 1: CABEÇALHO DA BARRA LATERAL (CANTO SUPERIOR ESQUERDO) */}
      <div className="bg-surface/50 border border-border rounded-2xl p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3 border-b border-border/50 pb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Layout className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Canto Superior Esquerdo — Barra Lateral
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dividido em duas partes: a Parte Externa (somente o ícone) e a Parte Interna (logotipo que preenche a área demarcada).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* PARTE EXTERNA: SOMENTE O ÍCONE */}
          <AssetUploader 
            title="Parte Externa — Somente o Ícone" 
            badge="Ícone Compacto"
            desc="Símbolo ou ícone isolado do sistema. Exibido na barra lateral recolhida, em telas compactas e como identificador visual."
            type="appIcon"
            aspectClass="aspect-square w-28 mx-auto"
          />

          {/* PARTE INTERNA: LOGOTIPO DA BARRA LATERAL */}
          <AssetUploader 
            title="Parte Interna — Logotipo Completo" 
            badge="Cabeçalho da Barra"
            desc="Acompanha o tamanho completo do retângulo demarcado no canto superior esquerdo da barra lateral. Preenche a área de forma proporcional e nítida."
            type="appLogo"
            aspectClass="aspect-[4/1] w-full"
          />
        </div>
      </div>

      {/* SEÇÃO 2: TELA DE LOGIN & NAVEGADOR */}
      <div className="bg-surface/50 border border-border rounded-2xl p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3 border-b border-border/50 pb-4">
          <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-foreground">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Tela de Login & Navegador
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personalize o logotipo de autenticação, o fundo da tela de login e o favicon da aba do navegador.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AssetUploader 
            title="Logotipo do Login" 
            desc="Exibido na tela de login à esquerda do formulário de acesso. Recomendado: Formato horizontal transparente."
            type="loginLogo"
            aspectClass="aspect-video"
          />
          <AssetUploader 
            title="Fundo do Login" 
            desc="Imagem de fundo da tela de autenticação. Recomendado: Resolução 1920x1080 (JPG ou WEBP)."
            type="loginBackground"
            aspectClass="aspect-video"
          />
          <AssetUploader 
            title="Favicon do Navegador" 
            desc="Ícone exibido na aba do navegador. Recomendado: Formato quadrado 32x32px ou 64x64px (ICO ou PNG)."
            type="favicon"
            aspectClass="aspect-square w-20 mx-auto"
          />
        </div>
      </div>
    </div>
  );
}
