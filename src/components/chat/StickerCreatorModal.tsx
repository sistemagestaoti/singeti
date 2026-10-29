"use client";

import { useState, useRef } from "react";
import { X, Sparkles, Upload, Type, Palette, Check, RefreshCw } from "lucide-react";

interface StickerCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStickerCreated: (sticker: any) => void;
}

export function StickerCreatorModal({
  isOpen,
  onClose,
  onStickerCreated,
}: StickerCreatorModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [shape, setShape] = useState<"rounded" | "circle">("rounded");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
    if (!allowedMimes.includes(file.type.toLowerCase())) {
      setError("Formato não suportado. Use PNG, WebP, JPG ou GIF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem original não pode exceder 5 MB.");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.onerror = () => {
      setError("Falha ao ler o arquivo selecionado.");
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAndSave = async () => {
    if (!imageSrc) {
      setError("Selecione uma imagem para a figurinha.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Cria imagem em memória para desenhar no canvas com o texto e o formato recortado
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageSrc;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      const size = 256;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Não foi possível inicializar renderizador.");

      // Limpa fundo
      ctx.clearRect(0, 0, size, size);

      // Se for formato circular, aplica máscara
      if (shape === "circle") {
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      } else {
        // Rounded rect
        ctx.save();
        const radius = 24;
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(size - radius, 0);
        ctx.quadraticCurveTo(size, 0, size, radius);
        ctx.lineTo(size, size - radius);
        ctx.quadraticCurveTo(size, size, size - radius, size);
        ctx.lineTo(radius, size);
        ctx.quadraticCurveTo(0, size, 0, size - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.clip();
      }

      // Desenha imagem proporcionalmente cobrindo o quadrado central
      const aspect = img.width / img.height;
      let drawW = size;
      let drawH = size;
      let drawX = 0;
      let drawY = 0;

      if (aspect > 1) {
        drawW = size * aspect;
        drawX = -(drawW - size) / 2;
      } else {
        drawH = size / aspect;
        drawY = -(drawH - size) / 2;
      }

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      // Configuração de estilo de texto de meme/figurinha
      const renderText = (text: string, yPos: number) => {
        if (!text.trim()) return;
        ctx.font = "900 24px Impact, Arial Black, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = textColor;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 5;
        ctx.lineJoin = "round";

        const upper = text.toUpperCase();
        ctx.strokeText(upper, size / 2, yPos);
        ctx.fillText(upper, size / 2, yPos);
      };

      if (topText.trim()) {
        renderText(topText, 40);
      }
      if (bottomText.trim()) {
        renderText(bottomText, size - 20);
      }

      // Converte preferencialmente para WebP otimizado (~85% menor que PNG) mantendo canal alfa/transparência
      let stickerDataUri = canvas.toDataURL("image/webp", 0.82);
      if (!stickerDataUri.startsWith("data:image/webp")) {
        stickerDataUri = canvas.toDataURL("image/png");
      }

      // Salva no banco de dados via API de Stickers
      const res = await fetch("/api/chat/stickers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: stickerDataUri,
          name: topText || bottomText || "Figurinha Personalizada",
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || "Erro ao salvar figurinha no banco de dados");
      }

      const saved = await res.json();
      onStickerCreated(saved);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Falha ao gerar figurinha.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface border border-border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden my-auto flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-hover/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Criador de Figurinhas</h3>
              <p className="text-[11px] text-muted-foreground">Crie figurinhas personalizadas para as conversas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Área de Visualização / Prévia */}
          <div className="flex flex-col items-center justify-center">
            {imageSrc ? (
              <div
                className={`relative w-48 h-48 border-2 border-primary/40 bg-black/20 overflow-hidden shadow-lg flex items-center justify-center transition-all ${
                  shape === "circle" ? "rounded-full" : "rounded-2xl"
                }`}
              >
                <img
                  src={imageSrc}
                  alt="Prévia"
                  className="w-full h-full object-cover"
                />
                {/* Texto Superior Sobreposto */}
                {topText.trim() && (
                  <div className="absolute top-2 left-0 right-0 text-center px-2 pointer-events-none">
                    <span
                      style={{ color: textColor }}
                      className="text-base font-black tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] stroke-black"
                    >
                      {topText}
                    </span>
                  </div>
                )}
                {/* Texto Inferior Sobreposto */}
                {bottomText.trim() && (
                  <div className="absolute bottom-2 left-0 right-0 text-center px-2 pointer-events-none">
                    <span
                      style={{ color: textColor }}
                      className="text-base font-black tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] stroke-black"
                    >
                      {bottomText}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-48 h-48 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-background hover:bg-surface-hover/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-all cursor-pointer p-4 text-center"
              >
                <Upload className="w-8 h-8 text-primary/60" />
                <span className="text-xs font-bold">Escolher Imagem</span>
                <span className="text-[10px] text-muted-foreground">JPG, PNG ou WebP do seu computador</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {imageSrc && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-xs text-primary font-bold hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Trocar imagem</span>
              </button>
            )}
          </div>

          {/* Ferramentas de Estilo */}
          {imageSrc && (
            <div className="space-y-3 pt-2 border-t border-border">
              {/* Formato de Enquadramento */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">Formato:</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShape("rounded")}
                    className={`px-3 py-1 rounded-lg font-bold border transition-colors ${
                      shape === "rounded" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    Quadrado
                  </button>
                  <button
                    type="button"
                    onClick={() => setShape("circle")}
                    className={`px-3 py-1 rounded-lg font-bold border transition-colors ${
                      shape === "circle" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    Circular
                  </button>
                </div>
              </div>

              {/* Textos Sobrepostos */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">Texto Superior:</label>
                  <input
                    type="text"
                    value={topText}
                    onChange={(e) => setTopText(e.target.value)}
                    placeholder="Ex: APROVADO"
                    maxLength={20}
                    className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground uppercase placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">Texto Inferior:</label>
                  <input
                    type="text"
                    value={bottomText}
                    onChange={(e) => setBottomText(e.target.value)}
                    placeholder="Ex: TOP DEMAIS!"
                    maxLength={20}
                    className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground uppercase placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Cor do Texto */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-primary" />
                  Cor do Texto:
                </span>
                <div className="flex items-center gap-1.5">
                  {[
                    { color: "#FFFFFF", name: "Branco" },
                    { color: "#FACC15", name: "Amarelo" },
                    { color: "#22C55E", name: "Verde" },
                    { color: "#EF4444", name: "Vermelho" },
                    { color: "#38BDF8", name: "Azul" },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setTextColor(c.color)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        textColor === c.color ? "scale-125 border-primary shadow-sm" : "border-border hover:scale-110"
                      }`}
                      style={{ backgroundColor: c.color }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl border border-border bg-surface text-foreground text-xs font-bold hover:bg-surface-hover"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGenerateAndSave}
              disabled={saving || !imageSrc}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{saving ? "Salvando..." : "Salvar Figurinha"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
