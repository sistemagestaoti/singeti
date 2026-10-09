import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';
import { X, ZoomIn, ZoomOut, RotateCcw, RotateCw } from 'lucide-react';

interface ImageCropperModalProps {
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => void;
}

export default function ImageCropperModal({ imageSrc, onClose, onCropComplete }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      if (croppedFile) {
        onCropComplete(croppedFile);
      } else {
        alert("Erro ao processar imagem.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao processar imagem.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-xl rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface">
          <h3 className="text-lg font-bold text-foreground">Ajustar Imagem do Perfil</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative w-full h-[400px] bg-black/90">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
          />
        </div>

        {/* Controls */}
        <div className="p-6 space-y-6">
          
          {/* Zoom */}
          <div className="flex items-center gap-4">
            <ZoomOut className="w-5 h-5 text-muted-foreground" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <ZoomIn className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Rotação */}
          <div className="flex items-center gap-4">
            <button onClick={() => setRotation(r => r - 90)} title="Girar Esquerda" className="p-2 text-muted-foreground hover:bg-surface-hover rounded-full transition-colors">
              <RotateCcw className="w-5 h-5" />
            </button>
            <input
              type="range"
              value={rotation}
              min={-180}
              max={180}
              step={1}
              aria-labelledby="Rotação"
              onChange={(e) => setRotation(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <button onClick={() => setRotation(r => r + 90)} title="Girar Direita" className="p-2 text-muted-foreground hover:bg-surface-hover rounded-full transition-colors">
              <RotateCw className="w-5 h-5" />
            </button>
          </div>

          {/* Botões Base */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Redefinir Ajustes
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold border border-border text-foreground hover:bg-surface-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isProcessing}
                className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center min-w-[120px]"
              >
                {isProcessing ? "Processando..." : "Salvar foto"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
