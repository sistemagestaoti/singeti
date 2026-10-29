"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

export interface ContextualHelpState {
  isOpen: boolean;
  manual: {
    id: string;
    title: string;
    module: string;
    submodule?: string | null;
    version: string;
    pdfUrl: string;
    fileName: string;
    description?: string | null;
    contentMarkdown?: string | null;
    articleId?: string | null;
  } | null;
  relatedManuals: Array<{
    id: string;
    title: string;
    contextKey: string;
    version: string;
    pdfUrl: string;
  }>;
  isLoading: boolean;
  hasLoaded: boolean;
  explicitContext: string | null;
  openHelp: (overrideContext?: string) => void;
  closeHelp: () => void;
  selectManual: (manual: any) => void;
}

const ContextualHelpContext = createContext<ContextualHelpState>({
  isOpen: false,
  manual: null,
  relatedManuals: [],
  isLoading: false,
  hasLoaded: false,
  explicitContext: null,
  openHelp: () => {},
  closeHelp: () => {},
  selectManual: () => {},
});

export const useContextualHelp = () => useContext(ContextualHelpContext);

export function ContextualHelpProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [manual, setManual] = useState<any>(null);
  const [relatedManuals, setRelatedManuals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [explicitContext, setExplicitContext] = useState<string | null>(null);

  const pathname = usePathname();

  const fetchManual = useCallback(
    async (contextOverride?: string) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("path", pathname || "/dashboard");
        if (contextOverride) {
          params.set("context", contextOverride);
        } else if (explicitContext) {
          params.set("context", explicitContext);
        }

        const res = await fetch(`/api/manuals/context?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setManual(data.manual || null);
          setRelatedManuals(data.relatedManuals || []);
          setHasLoaded(true);
        }
      } catch (err) {
        console.warn("Falha ao carregar manual contextual:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [pathname, explicitContext]
  );

  const openHelp = useCallback(
    (overrideContext?: string) => {
      if (overrideContext) {
        setExplicitContext(overrideContext);
      }
      setIsOpen(true);
      fetchManual(overrideContext);
    },
    [fetchManual]
  );

  const closeHelp = useCallback(() => {
    setIsOpen(false);
  }, []);

  const selectManual = useCallback((newManual: any) => {
    setManual(newManual);
  }, []);

  return (
    <ContextualHelpContext.Provider
      value={{
        isOpen,
        manual,
        relatedManuals,
        isLoading,
        hasLoaded,
        explicitContext,
        openHelp,
        closeHelp,
        selectManual,
      }}
    >
      {children}
    </ContextualHelpContext.Provider>
  );
}
