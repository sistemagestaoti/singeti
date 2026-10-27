"use client";

import { X, Download, ExternalLink } from "lucide-react";

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string | null;
  mediaTitle?: string;
}

export function MediaLightbox({
  isOpen,
  onClose,
  mediaUrl,
  mediaTitle = "Imagem",
}: MediaLightboxProps) {
  if (!isOpen || !mediaUrl) return null;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = mediaUrl;
    link.download = mediaTitle || "anexo-syngeti";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200"
    >
      {/* Top Header */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl flex items-center justify-between text-white z-10"
      >
        <span className="text-xs sm:text-sm font-bold truncate max-w-md">{mediaTitle}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Baixar imagem"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Baixar</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex-1 max-w-5xl w-full flex items-center justify-center p-2 relative my-auto"
      >
        <img
          src={mediaUrl}
          alt={mediaTitle}
          className="max-h-[82vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
        />
      </div>

      {/* Footer Hint */}
      <div className="text-white/50 text-[11px] text-center">
        Clique fora da imagem ou pressione Esc para fechar
      </div>
    </div>
  );
}
