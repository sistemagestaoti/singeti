"use client";

import { useState, useRef, useEffect, useId } from "react";
import { Check, ChevronDown, Plus, Search, Loader2, AlertCircle, X } from "lucide-react";
import { normalizeString, areStringsEquivalent } from "@/lib/normalize";

export interface SmartOption {
  value?: string;
  id?: string;
  label: string;
  sublabel?: string | null;
  badge?: string | null;
  data?: any;
}

export type SmartSelectOption = SmartOption;

export const getOptionValue = (opt: SmartOption): string => opt.value ?? opt.id ?? opt.label ?? "";

export interface SmartSelectProps {
  label?: string;
  placeholder?: string;
  emptyMessage?: string;
  options: SmartOption[];
  value?: string;
  onChange: (value: string, option?: SmartOption | null) => void;
  /** Função assíncrona para persistir uma nova opção no banco de dados */
  onCreateOption?: (inputValue: string) => Promise<SmartOption>;
  creatableText?: string;
  clearable?: boolean;
  showAddIconOnEmpty?: boolean;
  /** Se habilitado, permite selecionar/manter texto livre mesmo sem salvar no banco */
  allowFreeText?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  hint?: string;
}

export default function SmartSelect({
  label,
  placeholder = "Selecione ou digite para buscar/adicionar...",
  emptyMessage = "Nenhuma opção encontrada",
  options,
  value,
  onChange,
  onCreateOption,
  creatableText,
  clearable,
  showAddIconOnEmpty,
  allowFreeText = false,
  required = false,
  disabled = false,
  className = "",
  icon,
  hint,
}: SmartSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // Opção atualmente selecionada
  const selectedOption = options.find((opt) => getOptionValue(opt) === value) || (value ? { value, label: value } : null);

  // Filtragem tolerante a acentos e maiúsculas/minúsculas
  const filteredOptions = options.filter((opt) => {
    if (!searchTerm.trim()) return true;
    const term = normalizeString(searchTerm);
    return (
      normalizeString(opt.label).includes(term) ||
      (opt.sublabel && normalizeString(opt.sublabel).includes(term))
    );
  });

  // Janelamento de desempenho: renderiza no máximo 45 itens no DOM para abertura instantânea do dropdown
  const MAX_VISIBLE_OPTIONS = 45;
  const visibleOptions = filteredOptions.slice(0, MAX_VISIBLE_OPTIONS);
  const remainingCount = filteredOptions.length - visibleOptions.length;

  // Verifica se o texto digitado já existe exatamente em alguma opção
  const exactMatch = options.find((opt) => areStringsEquivalent(opt.label, searchTerm.trim()));
  const showCreateOption =
    !!onCreateOption &&
    searchTerm.trim().length > 0 &&
    !exactMatch &&
    !isCreating;

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
        setErrorMessage(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Foco no input de busca ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setHighlightedIndex(0);
    } else {
      setSearchTerm("");
      setErrorMessage(null);
    }
  }, [isOpen]);

  const handleSelect = (option: SmartOption) => {
    onChange(getOptionValue(option), option);
    setIsOpen(false);
    setSearchTerm("");
    setErrorMessage(null);
  };

  const handleCreateNew = async () => {
    const trimmed = searchTerm.trim();
    if (!trimmed || !onCreateOption) return;

    // Se já existir equivalente, seleciona-o sem duplicar
    if (exactMatch) {
      handleSelect(exactMatch);
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const created = await onCreateOption(trimmed);
      const createdVal = created ? getOptionValue(created) : null;
      if (createdVal) {
        onChange(createdVal, { ...created, value: createdVal });
        setIsOpen(false);
        setSearchTerm("");
      } else {
        throw new Error("Opção criada não retornou identificador válido.");
      }
    } catch (err: any) {
      console.error("SmartSelect create error:", err);
      setErrorMessage(err?.message || "Erro ao salvar novo registro no banco");
    } finally {
      setIsCreating(false);
    }
  };

  // Teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const totalItems = filteredOptions.length + (showCreateOption ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % (totalItems || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + totalItems) % (totalItems || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex]);
      } else if (showCreateOption && (highlightedIndex === filteredOptions.length || filteredOptions.length === 0)) {
        handleCreateNew();
      } else if (allowFreeText && searchTerm.trim()) {
        onChange(searchTerm.trim(), { value: searchTerm.trim(), label: searchTerm.trim() });
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          {icon}
          <span>{label}</span>
          {required && <span className="text-danger">*</span>}
        </label>
      )}

      {/* Gatilho de Seleção */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl border transition-all text-xs sm:text-sm font-medium ${
          disabled
            ? "bg-muted/40 border-border text-muted-foreground cursor-not-allowed"
            : isOpen
            ? "border-primary ring-2 ring-primary/20 bg-surface shadow-xs"
            : "border-border bg-surface hover:border-primary/50 text-foreground shadow-2xs"
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-foreground truncate">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold shrink-0">
                  {selectedOption.badge}
                </span>
              )}
              {selectedOption.sublabel && (
                <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
                  • {selectedOption.sublabel}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground line-clamp-1">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("", null);
              }}
              className="p-1 hover:text-foreground hover:bg-surface-elevated rounded-md transition-colors"
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : ""}`} />
        </div>
      </button>

      {hint && <span className="text-[10px] text-muted-foreground px-1">{hint}</span>}

      {/* Dropdown Flutuante */}
      {isOpen && (
        <div
          id={listboxId}
          className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-surface border border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-72 flex flex-col"
        >
          {/* Campo de Pesquisa / Digitação */}
          <div className="p-2 border-b border-border bg-surface-elevated/60">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-muted-foreground pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(0);
                  setErrorMessage(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Pesquisar ou digitar novo valor..."
                className="w-full text-xs bg-surface border border-border rounded-xl pl-8 pr-3 py-2 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Mensagem de Erro de Gravação */}
          {errorMessage && (
            <div className="p-2.5 mx-2 mt-2 rounded-xl bg-danger/10 border border-danger/30 text-danger text-[11px] font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {/* Lista de Opções */}
          <div className="overflow-y-auto flex-1 p-1.5 space-y-0.5 divide-y divide-border/20">
            {/* Opção de Cadastrar Novo Valor */}
            {showCreateOption && (
              <button
                type="button"
                disabled={isCreating}
                onClick={handleCreateNew}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-colors ${
                  highlightedIndex === filteredOptions.length || filteredOptions.length === 0
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin text-current" />
                ) : (
                  <Plus className="w-4 h-4 text-current" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="truncate">
                    {isCreating ? "Salvando no banco de dados..." : creatableText ? `${creatableText} "${searchTerm.trim()}"` : `+ Adicionar "${searchTerm.trim()}"`}
                  </div>
                  <div className="text-[10px] font-normal opacity-80">
                    Cadastrar e persistir permanentemente para novos chamados
                  </div>
                </div>
              </button>
            )}

            {/* Opções Filtradas com janela de renderização ultrarrápida */}
            {visibleOptions.length > 0 ? (
              <>
                {visibleOptions.map((opt, idx) => {
                  const optVal = getOptionValue(opt);
                  const isSelected = optVal === value;
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <button
                      key={`${optVal}-${idx}`}
                      type="button"
                      onClick={() => handleSelect(opt)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                        isSelected
                          ? "bg-primary/15 text-primary font-bold"
                          : isHighlighted
                          ? "bg-surface-elevated text-foreground font-semibold"
                          : "text-foreground hover:bg-surface-elevated/70"
                      }`}
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{opt.label}</span>
                          {opt.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-elevated text-muted-foreground border border-border">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.sublabel && (
                          <span className="text-[10px] text-muted-foreground truncate">{opt.sublabel}</span>
                        )}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}

                {remainingCount > 0 && (
                  <div className="py-2 px-3 text-center text-[10px] text-muted-foreground bg-surface-elevated/40 border-t border-border/40 rounded-b-xl select-none">
                    +{remainingCount} opções adicionais disponíveis. Digite para filtrar.
                  </div>
                )}
              </>
            ) : !showCreateOption ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {emptyMessage}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
