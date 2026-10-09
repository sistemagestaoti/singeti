"use client";

import { useState } from "react";
import { Upload, RefreshCcw, Save, X, Image as ImageIcon } from "lucide-react";
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

  const AssetUploader = ({ title, desc, type, aspectClass, bgClass = "bg-slate-900" }: { title: string, desc: string, type: AssetType, aspectClass: string, bgClass?: string }) => {
    const url = data[type];
    const isLoading = loading === type;

    return (
      <div className="bg-surface border border-border rounded-xl p-5 shadow-sm flex flex-col">
        <div className="mb-4">
          <h3 className="font-bold text-foreground text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>

        <div className={`w-full ${aspectClass} ${bgClass} rounded-lg border border-border/50 flex items-center justify-center overflow-hidden relative mb-4`}>
          {url ? (
            <img src={url} alt={title} className="object-contain w-full h-full p-2" />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 opacity-50">
              <ImageIcon className="w-10 h-10 mb-2" />
              <span className="text-xs font-medium uppercase tracking-wider">Padrão</span>
            </div>
          )}
        </div>

        <div className="mt-auto flex gap-2">
          <label className="flex-1">
            <span className={`block w-full text-center py-2 px-3 rounded-lg text-sm font-bold border transition-all cursor-pointer ${isLoading ? 'bg-muted text-muted-foreground border-transparent opacity-50 cursor-not-allowed' : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'}`}>
              {isLoading ? "Processando..." : (url ? "Substituir" : "Importar Imagem")}
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
              title="Restaurar Padrão"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AssetUploader 
        title="Logotipo do Login" 
        desc="Exibido na tela inicial de autenticação. Recomendado: SVG ou PNG transparente (horizontal)."
        type="loginLogo"
        aspectClass="aspect-video"
      />
      <AssetUploader 
        title="Fundo do Login" 
        desc="Imagem de fundo da tela inicial. Recomendado: JPG/WEBP alta resolução."
        type="loginBackground"
        aspectClass="aspect-video"
      />
      <AssetUploader 
        title="Logotipo Interno" 
        desc="Exibido no painel lateral/superior do sistema. Recomendado: PNG/SVG transparente (horizontal)."
        type="appLogo"
        aspectClass="aspect-[3/1]"
      />
      <AssetUploader 
        title="Ícone do Aplicativo" 
        desc="Usado em telas compactas e atalhos. Recomendado: Quadrado perfeito (PNG/SVG)."
        type="appIcon"
        aspectClass="aspect-square w-32 mx-auto"
      />
      <AssetUploader 
        title="Favicon" 
        desc="Ícone exibido na aba do navegador. Recomendado: ICO ou PNG 32x32px."
        type="favicon"
        aspectClass="aspect-square w-16 mx-auto"
      />
    </div>
  );
}
