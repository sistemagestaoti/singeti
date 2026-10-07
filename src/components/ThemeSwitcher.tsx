"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun, Palette } from "lucide-react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />;
  }

  return (
    <div className="relative group">
      <button className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
        {theme === 'light' ? <Sun size={16} /> : 
         theme === 'dark' ? <Moon size={16} /> : 
         theme === 'tokyo-night' ? <Monitor size={16} className="text-[#bb9af7]" /> :
         <Palette size={16} className="text-[#8a1c22]" />}
      </button>
      
      <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="py-1">
          <button onClick={() => setTheme('light')} className={`block w-full text-left px-4 py-2 text-sm ${theme === 'light' ? 'bg-accent text-accent-foreground font-semibold' : 'text-card-foreground hover:bg-muted'}`}>
            <Sun size={14} className="inline mr-2" /> Padrão (Light)
          </button>
          <button onClick={() => setTheme('dark')} className={`block w-full text-left px-4 py-2 text-sm ${theme === 'dark' ? 'bg-accent text-accent-foreground font-semibold' : 'text-card-foreground hover:bg-muted'}`}>
            <Moon size={14} className="inline mr-2" /> Black (Dark)
          </button>
          <button onClick={() => setTheme('tokyo-night')} className={`block w-full text-left px-4 py-2 text-sm ${theme === 'tokyo-night' ? 'bg-accent text-accent-foreground font-semibold' : 'text-card-foreground hover:bg-muted'}`}>
            <Monitor size={14} className="inline mr-2 text-[#bb9af7]" /> Tokyo Night
          </button>
          <button onClick={() => setTheme('dlamb')} className={`block w-full text-left px-4 py-2 text-sm ${theme === 'dlamb' ? 'bg-accent text-accent-foreground font-semibold' : 'text-card-foreground hover:bg-muted'}`}>
            <Palette size={14} className="inline mr-2 text-[#8a1c22]" /> D'Lamb Sport
          </button>
        </div>
      </div>
    </div>
  );
}
