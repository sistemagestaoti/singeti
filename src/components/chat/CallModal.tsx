"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff, 
  Monitor, Maximize2, Minimize2, Volume2, User
} from "lucide-react";

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  targetAvatar?: string | null;
  callType: "audio" | "video";
}

export function CallModal({
  isOpen,
  onClose,
  targetName,
  targetAvatar,
  callType = "video",
}: CallModalProps) {
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(callType === "video");
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<"connecting" | "connected">("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Inicializa o stream de mídia local (Áudio e/ou Vídeo)
  useEffect(() => {
    if (!isOpen) {
      cleanupStreams();
      return;
    }

    let isMounted = true;
    setCallStatus("connecting");
    setCallDuration(0);
    setErrorMessage(null);

    async function initMedia() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Seu navegador não suporta chamadas em tempo real.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === "video" ? { width: 1280, height: 720 } : false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current && callType === "video") {
          localVideoRef.current.srcObject = stream;
        }

        setCallStatus("connected");
      } catch (err: any) {
        console.error("Erro ao acessar câmera/microfone:", err);
        setErrorMessage(
          err?.name === "NotAllowedError"
            ? "Permissão de microfone/câmera negada pelo usuário."
            : "Dispositivo de áudio ou vídeo não encontrado."
        );
        setCallStatus("connected");
      }
    }

    initMedia();

    return () => {
      isMounted = false;
      cleanupStreams();
    };
  }, [isOpen, callType]);

  // Timer de Duração da Chamada
  useEffect(() => {
    if (!isOpen || callStatus !== "connected") return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, callStatus]);

  const cleanupStreams = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
  };

  const handleEndCall = () => {
    cleanupStreams();
    onClose();
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    } else {
      setMicEnabled((prev) => !prev);
    }
  };

  const toggleVideo = async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      } else if (!videoEnabled) {
        // Tenta obter track de vídeo caso tenha iniciado apenas com áudio
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const newTrack = videoStream.getVideoTracks()[0];
          localStreamRef.current.addTrack(newTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          setVideoEnabled(true);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStreamRef.current = screenStream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);

        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        };
      } catch (e) {
        console.error("Compartilhamento de tela cancelado:", e);
      }
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-8 animate-in fade-in duration-200">
      
      {/* Top Header */}
      <div className="w-full max-w-4xl flex items-center justify-between text-white z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-primary">
            {targetAvatar ? (
              <img src={targetAvatar} alt={targetName} className="w-full h-full rounded-full object-cover" />
            ) : (
              targetName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
              <span>{targetName}</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {callType === "video" ? "Vídeo HD" : "Voz"}
              </span>
            </h2>
            <p className="text-xs text-white/70">
              {callStatus === "connecting" ? "Conectando chamada..." : `Em chamada • ${formatDuration(callDuration)}`}
            </p>
          </div>
        </div>

        {/* Indicador de Status */}
        <div className="flex items-center gap-2">
          {isScreenSharing && (
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30 animate-pulse flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5" />
              <span>Compartilhando Tela</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Call Stage */}
      <div className="w-full max-w-4xl flex-1 flex items-center justify-center relative my-4 rounded-3xl overflow-hidden bg-slate-950 border border-white/10 shadow-2xl">
        
        {/* Se for vídeo ou compartilhamento de tela */}
        {(videoEnabled || isScreenSharing) ? (
          <div className="w-full h-full relative flex items-center justify-center bg-black">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          /* Se for áudio */
          <div className="flex flex-col items-center justify-center gap-5 p-8 text-center animate-in fade-in">
            <div className="relative">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-primary/20 border-4 border-primary/40 flex items-center justify-center text-primary text-4xl font-extrabold shadow-xl">
                {targetAvatar ? (
                  <img src={targetAvatar} alt={targetName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  targetName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-black text-xs font-bold shadow-md animate-pulse">
                Áudio Conectado
              </div>
            </div>
            <div>
              <p className="text-white text-base font-bold">{targetName}</p>
              <p className="text-white/60 text-xs mt-0.5">Comunicação criptografada ponto a ponto (WebRTC)</p>
            </div>
            {/* Onda sonora animada */}
            <div className="flex items-center gap-1 h-6">
              {[40, 70, 30, 90, 50, 80, 25, 65, 85, 35].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className="w-1 bg-primary/80 rounded-full animate-pulse"
                />
              ))}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="absolute bottom-4 left-4 right-4 bg-danger/90 text-white p-3 rounded-2xl text-xs font-semibold text-center backdrop-blur-xs">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="flex items-center gap-3 sm:gap-4 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 z-10 shadow-2xl">
        
        {/* Microfone */}
        <button
          type="button"
          onClick={toggleMic}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
            micEnabled
              ? "bg-white/20 hover:bg-white/30 text-white"
              : "bg-red-500 hover:bg-red-600 text-white shadow-lg"
          }`}
          title={micEnabled ? "Desativar Microfone (Mudo)" : "Ativar Microfone"}
        >
          {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {/* Câmera / Vídeo */}
        <button
          type="button"
          onClick={toggleVideo}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
            videoEnabled
              ? "bg-white/20 hover:bg-white/30 text-white"
              : "bg-white/10 hover:bg-white/20 text-white/50"
          }`}
          title={videoEnabled ? "Desligar Câmera" : "Ligar Câmera"}
        >
          {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        {/* Compartilhamento de Tela */}
        <button
          type="button"
          onClick={toggleScreenShare}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
            isScreenSharing
              ? "bg-amber-500 hover:bg-amber-600 text-black shadow-lg"
              : "bg-white/20 hover:bg-white/30 text-white"
          }`}
          title={isScreenSharing ? "Parar Compartilhamento" : "Compartilhar Tela"}
        >
          <Monitor className="w-5 h-5" />
        </button>

        {/* Botão Encerrar Chamada */}
        <button
          type="button"
          onClick={handleEndCall}
          className="w-14 h-12 rounded-2xl bg-danger hover:bg-danger-hover text-white flex items-center justify-center transition-all shadow-xl hover:scale-105 active:scale-95 ml-2"
          title="Encerrar Chamada"
        >
          <PhoneOff className="w-6 h-6" />
        </button>

      </div>

    </div>
  );
}
