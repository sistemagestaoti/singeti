"use client";

import { useState, useEffect } from "react";
import { X, Volume2, VolumeX, Bell, BellOff, Shield, Check, Lock, Sliders } from "lucide-react";
import { soundManager } from "@/lib/sound";

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeChannelId?: string;
  activeChannelName?: string;
  isMuted?: boolean;
  onToggleMuteChannel?: (channelId: string) => void;
}

export function ChatSettingsModal({
  isOpen,
  onClose,
  activeChannelId,
  activeChannelName,
  isMuted,
  onToggleMuteChannel,
}: ChatSettingsModalProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopNotify, setDesktopNotify] = useState(true);
  const [hidePreview, setHidePreview] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>("default");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSound = localStorage.getItem("connect_chat_sound");
      if (storedSound !== null) setSoundEnabled(storedSound === "true");

      const storedDesktop = localStorage.getItem("connect_chat_desktop");
      if (storedDesktop !== null) setDesktopNotify(storedDesktop === "true");

      const storedPrivacy = localStorage.getItem("connect_chat_privacy");
      if (storedPrivacy !== null) setHidePreview(storedPrivacy === "true");

      if ("Notification" in window) {
        setPermissionStatus(Notification.permission);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("connect_chat_sound", String(next));
    if (next) {
      soundManager.playMessageReceived();
    }
  };

  const handleToggleDesktop = async () => {
    const next = !desktopNotify;
    setDesktopNotify(next);
    localStorage.setItem("connect_chat_desktop", String(next));

    if (next && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        const res = await Notification.requestPermission();
        setPermissionStatus(res);
      }
    }
  };

  const handleTogglePrivacy = () => {
    const next = !hidePreview;
    setHidePreview(next);
    localStorage.setItem("connect_chat_privacy", String(next));
  };

  const requestBrowserPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const res = await Notification.requestPermission();
      setPermissionStatus(res);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-surface-hover/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Preferências do Connect Chat</h3>
              <p className="text-[11px] text-muted-foreground">Estilo Microsoft Teams — notificações e privacidade</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Som de Novas Mensagens */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-hover/20">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${soundEnabled ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <p className="font-bold text-foreground">Sons de Mensagem</p>
                <p className="text-[11px] text-muted-foreground">Reproduzir aviso sonoro sutil ao receber mensagens</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleSound}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${soundEnabled ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${soundEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Notificações no Navegador / Área de Trabalho */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-hover/20">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${desktopNotify ? "bg-blue-500/10 text-blue-500" : "bg-muted text-muted-foreground"}`}>
                {desktopNotify ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </div>
              <div>
                <p className="font-bold text-foreground">Notificações no Navegador</p>
                <p className="text-[11px] text-muted-foreground">Alertas desktop quando estiver em outra aba ou tela</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleDesktop}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${desktopNotify ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${desktopNotify ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Status da Permissão do Navegador */}
          {permissionStatus !== "granted" && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] flex items-center justify-between gap-2">
              <span>Permissão no navegador: <strong>{permissionStatus === "denied" ? "Bloqueada" : "Pendente"}</strong></span>
              {permissionStatus !== "denied" && (
                <button
                  type="button"
                  onClick={requestBrowserPermission}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-bold text-[10px] hover:bg-amber-400 transition-colors"
                >
                  Permitir Agora
                </button>
              )}
            </div>
          )}

          {/* Privacidade: Ocultar Prévia de Texto */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-hover/20">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hidePreview ? "bg-purple-500/10 text-purple-400" : "bg-muted text-muted-foreground"}`}>
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-foreground">Privacidade Corporativa</p>
                <p className="text-[11px] text-muted-foreground">Ocultar prévia do texto nas notificações de desktop</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleTogglePrivacy}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${hidePreview ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${hidePreview ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Silenciar Canal Atual (Se aplicável) */}
          {activeChannelId && onToggleMuteChannel && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-hover/20">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isMuted ? "bg-rose-500/10 text-rose-500" : "bg-muted text-muted-foreground"}`}>
                  <BellOff className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Silenciar Esta Conversa</p>
                  <p className="text-[11px] text-muted-foreground">
                    {activeChannelName ? `"${activeChannelName}"` : "Conversa atual"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleMuteChannel(activeChannelId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isMuted
                    ? "bg-rose-500 text-white hover:bg-rose-600"
                    : "bg-surface border border-border text-foreground hover:bg-surface-hover"
                }`}
              >
                {isMuted ? "Silenciado" : "Silenciar"}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end bg-surface shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors shadow-xs"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
}
