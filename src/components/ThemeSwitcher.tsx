"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, Palette, Check } from "lucide-react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />;
  }

  const themes = [
    { id: "dark", label: "SYNGETI Dark", icon: Moon, color: "text-[#00D5F2]" },
    { id: "light", label: "Padrão Claro", icon: Sun, color: "text-amber-500" },
    { id: "tokyo-night", label: "Tokyo Night", icon: Monitor, color: "text-[#bb9af7]" },
    { id: "dlamb", label: "D'Lamb Sport", icon: Palette, color: "text-[#c5222a]" },
  ];

  const currentTheme = themes.find(t => t.id === theme) || themes[0];
  const CurrentIcon = currentTheme.icon;

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setOpen(!open)}
        title="Alternar tema visual"
        aria-label="Alternar tema visual"
        className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground transition-all focus:outline-none focus:ring-2 focus:ring-ring border border-border/60"
      >
        <CurrentIcon size={16} className={currentTheme.color} />
      </button>
      
      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-surface border border-border rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Tema Visual
          </div>
          <div className="p-1 space-y-0.5">
            {themes.map((t) => {
              const Icon = t.icon;
              const isSelected = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isSelected 
                      ? 'bg-primary/15 text-primary font-semibold' 
                      : 'text-foreground hover:bg-surface-hover hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={15} className={t.color} />
                    <span>{t.label}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
