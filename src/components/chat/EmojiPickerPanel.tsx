"use client";

import { useState, useMemo, useEffect, useRef, memo } from "react";
import { Search, Star, X } from "lucide-react";
import {
  EMOJI_CATALOG,
  EMOJI_CATEGORY_META,
  SKIN_TONES,
  applySkinTone,
  type EmojiCategoryId,
  type EmojiItem,
} from "@/lib/emojiCatalog";

interface EmojiPickerPanelProps {
  onSelectEmoji: (emoji: string) => void;
  recentEmojis: string[];
  favoriteEmojis: string[];
  onToggleFavorite: (emoji: string) => void;
  skinTone: string;
  onChangeSkinTone: (tone: string) => void;
  compact?: boolean;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export const EmojiPickerPanel = memo(function EmojiPickerPanel({
  onSelectEmoji,
  recentEmojis,
  favoriteEmojis,
  onToggleFavorite,
  skinTone,
  onChangeSkinTone,
  compact = false,
}: EmojiPickerPanelProps) {
  const [activeCategory, setActiveCategory] = useState<EmojiCategoryId>("rostos");
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [hoveredItem, setHoveredItem] = useState<{ emoji: string; name: string } | null>(null);
  const [showSkinToneMenu, setShowSkinToneMenu] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Mapa rápido de metadados por caractere emoji base
  const catalogByEmoji = useMemo(() => {
    const map = new Map<string, EmojiItem>();
    for (const item of EMOJI_CATALOG) {
      map.set(item.e, item);
    }
    return map;
  }, []);

  // Lista filtrada conforme busca ou categoria selecionada
  const displayedEmojis = useMemo(() => {
    const q = normalizeText(searchQuery.trim());
    if (q) {
      return EMOJI_CATALOG.filter((item) => {
        const nameNorm = normalizeText(item.n);
        const keyNorm = normalizeText(item.k);
        return nameNorm.includes(q) || keyNorm.includes(q) || item.e.includes(q);
      }).map((item) => ({
        emoji: applySkinTone(item.e, skinTone, item.s),
        baseEmoji: item.e,
        name: item.n,
      }));
    }

    if (activeCategory === "recentes") {
      return recentEmojis.map((e) => {
        const stripped = e.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "");
        const meta = catalogByEmoji.get(e) || catalogByEmoji.get(stripped);
        return {
          emoji: e,
          baseEmoji: meta?.e || e,
          name: meta?.n || "Emoji recente",
        };
      });
    }

    if (activeCategory === "favoritos") {
      return favoriteEmojis.map((e) => {
        const stripped = e.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "");
        const meta = catalogByEmoji.get(e) || catalogByEmoji.get(stripped);
        return {
          emoji: e,
          baseEmoji: meta?.e || e,
          name: meta?.n || "Emoji favorito",
        };
      });
    }

    return EMOJI_CATALOG.filter((item) => item.c === activeCategory).map((item) => ({
      emoji: applySkinTone(item.e, skinTone, item.s),
      baseEmoji: item.e,
      name: item.n,
    }));
  }, [activeCategory, searchQuery, recentEmojis, favoriteEmojis, skinTone, catalogByEmoji]);

  useEffect(() => {
    setFocusedIndex(0);
  }, [activeCategory, searchQuery]);

  const columns = compact ? 7 : 8;

  // Navegação completa por teclado (Setas, Enter, Favoritar com 'F')
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (displayedEmojis.length === 0) return;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % displayedEmojis.length);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + displayedEmojis.length) % displayedEmojis.length);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.min(displayedEmojis.length - 1, prev + columns));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => Math.max(0, prev - columns));
    } else if (e.key === "Enter" && document.activeElement !== searchInputRef.current) {
      e.preventDefault();
      const target = displayedEmojis[focusedIndex];
      if (target) onSelectEmoji(target.emoji);
    }
  };

  const currentToneObj = SKIN_TONES.find((t) => t.modifier === skinTone) || SKIN_TONES[0];
  const activeItem = hoveredItem || (displayedEmojis[focusedIndex] ? { emoji: displayedEmojis[focusedIndex].emoji, name: displayedEmojis[focusedIndex].name } : null);

  return (
    <div
      onKeyDown={handleKeyDown}
      className="flex flex-col flex-1 min-h-0 overflow-hidden select-none"
    >
      {/* Topo: Campo de Busca + Seletor de Tom de Pele */}
      <div className="p-2 pb-1.5 flex items-center gap-1.5 border-b border-border/60 bg-surface">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar emoji pelo nome (ex: feliz, foguete, café)..."
            className="w-full bg-background border border-border rounded-xl pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title="Limpar pesquisa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Botão de Tom de Pele */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSkinToneMenu((prev) => !prev)}
            title={`Tom de pele: ${currentToneObj.label}`}
            className="h-8 px-2 rounded-xl border border-border bg-background hover:bg-surface-hover flex items-center gap-1 text-xs transition-colors"
          >
            <span className="text-sm leading-none">{applySkinTone("👋", skinTone, true)}</span>
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/20"
              style={{ backgroundColor: currentToneObj.swatch }}
            />
          </button>

          {showSkinToneMenu && (
            <div className="absolute right-0 top-10 z-40 bg-surface border border-border rounded-xl shadow-xl p-1.5 flex items-center gap-1 animate-in fade-in zoom-in-95 duration-100">
              {SKIN_TONES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onChangeSkinTone(t.modifier);
                    setShowSkinToneMenu(false);
                  }}
                  title={t.label}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-base hover:bg-surface-hover transition-transform hover:scale-110 ${
                    skinTone === t.modifier ? "ring-2 ring-primary bg-primary/10" : ""
                  }`}
                >
                  {applySkinTone("👋", t.modifier, true)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Barra de 10 Categorias + Favoritos */}
      {!searchQuery.trim() && (
        <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-border/60 bg-surface-hover/30 overflow-x-auto custom-scrollbar">
          {EMOJI_CATEGORY_META.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                title={cat.label}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition-all ${
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/30 shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                <span className="text-sm leading-none">{cat.icon}</span>
                <span className="hidden sm:inline">{cat.shortLabel}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Título da Categoria Ativa + Dica */}
      <div className="px-3 py-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border/40">
        <span>
          {searchQuery.trim()
            ? `Resultados da pesquisa (${displayedEmojis.length})`
            : EMOJI_CATEGORY_META.find((c) => c.id === activeCategory)?.label}
        </span>
        <span className="text-[9px] font-medium normal-case opacity-75">
          Estrela ★ para favoritar
        </span>
      </div>

      {/* Grade de Emojis */}
      <div
        ref={gridRef}
        className="grid grid-cols-7 sm:grid-cols-8 gap-1 overflow-y-auto max-h-56 p-2 custom-scrollbar bg-background/20"
      >
        {displayedEmojis.length === 0 ? (
          <div className="col-span-full py-8 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">
              {activeCategory === "recentes"
                ? "Nenhum emoji recente ainda."
                : activeCategory === "favoritos"
                  ? "Você ainda não favoritou nenhum emoji."
                  : "Nenhum emoji encontrado para esta busca."}
            </p>
            <p className="text-[11px]">
              {activeCategory === "favoritos"
                ? "Passe o mouse sobre qualquer emoji e clique na estrela ★ para salvar aqui."
                : "Experimente buscar por outra palavra em português."}
            </p>
          </div>
        ) : (
          displayedEmojis.map((item, idx) => {
            const isFav = favoriteEmojis.includes(item.emoji);
            const isFocused = idx === focusedIndex;
            return (
              <div
                key={`${item.emoji}_${idx}`}
                onMouseEnter={() => {
                  setHoveredItem({ emoji: item.emoji, name: item.name });
                  setFocusedIndex(idx);
                }}
                onMouseLeave={() => setHoveredItem(null)}
                className="relative group/emojicell flex items-center justify-center"
              >
                <button
                  type="button"
                  onClick={() => onSelectEmoji(item.emoji)}
                  title={item.name}
                  className={`w-9 h-9 flex items-center justify-center text-xl rounded-xl transition-transform duration-100 hover:scale-125 hover:bg-surface-hover ${
                    isFocused ? "bg-primary/15 ring-1 ring-primary/40" : ""
                  }`}
                >
                  {item.emoji}
                </button>
                {/* Botão discreto de favoritar no canto superior direito da célula */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(item.emoji);
                  }}
                  title={isFav ? "Remover dos favoritos" : "Salvar nos favoritos"}
                  className={`absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center transition-opacity ${
                    isFav
                      ? "opacity-100 bg-amber-500/20 text-amber-400"
                      : "opacity-0 group-hover/emojicell:opacity-100 bg-surface/90 text-muted-foreground hover:text-amber-400 border border-border/60"
                  }`}
                >
                  <Star className={`w-2.5 h-2.5 ${isFav ? "fill-amber-400 text-amber-400" : ""}`} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Rodapé de Pré-visualização e Favorito Rápido */}
      <div className="px-3 py-1.5 border-t border-border bg-surface flex items-center justify-between text-xs min-h-[36px]">
        {activeItem ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl leading-none">{activeItem.emoji}</span>
              <span className="font-semibold text-foreground truncate text-xs">
                {activeItem.name}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onToggleFavorite(activeItem.emoji)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-colors shrink-0 ${
                favoriteEmojis.includes(activeItem.emoji)
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Star
                className={`w-3 h-3 ${
                  favoriteEmojis.includes(activeItem.emoji) ? "fill-amber-400 text-amber-400" : ""
                }`}
              />
              <span>{favoriteEmojis.includes(activeItem.emoji) ? "Favorito" : "Favoritar"}</span>
            </button>
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            Selecione um emoji ou use as setas do teclado
          </span>
        )}
      </div>
    </div>
  );
});
