"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { SessionGuard } from "@/components/SessionGuard";

interface MobileMenuContextType {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
}

const MobileMenuContext = createContext<MobileMenuContextType>({
  isMobileOpen: false,
  setIsMobileOpen: () => {},
  toggleMobileMenu: () => {},
  closeMobileMenu: () => {},
});

export const useMobileMenu = () => useContext(MobileMenuContext);

export function AuthenticatedShell({
  userName,
  userAvatar,
  initialBranding,
  children,
}: {
  userName: string;
  userAvatar: string | null;
  initialBranding: any;
  children: React.ReactNode;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  // Fecha o menu móvel automaticamente ao navegar
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const toggleMobileMenu = () => setIsMobileOpen((prev) => !prev);
  const closeMobileMenu = () => setIsMobileOpen(false);

  return (
    <MobileMenuContext.Provider value={{ isMobileOpen, setIsMobileOpen, toggleMobileMenu, closeMobileMenu }}>
      <div className="flex h-screen overflow-hidden bg-background">
        <SessionGuard />

        {/* Sidebar responsiva (drawer deslizante no mobile, fixa no desktop) */}
        <Sidebar initialBranding={initialBranding} />

        {/* Backdrop escurecido para fechar a sidebar no mobile ao clicar fora */}
        {isMobileOpen && (
          <div
            onClick={closeMobileMenu}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
            aria-label="Fechar menu lateral"
          />
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar userName={userName} avatar={userAvatar} />
          {pathname?.startsWith("/connect") ? (
            <main className="flex-1 overflow-hidden p-0 sm:p-3 md:p-6 flex flex-col min-h-0">
              <div className="max-w-7xl mx-auto w-full h-full flex flex-col flex-1 min-h-0">
                {children}
              </div>
            </main>
          ) : (
            <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8">
              <div className="max-w-7xl mx-auto w-full">
                {children}
              </div>
            </main>
          )}
        </div>
      </div>
    </MobileMenuContext.Provider>
  );
}
