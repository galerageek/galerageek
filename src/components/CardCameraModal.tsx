import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Upload, Sparkles, AlertCircle, Check, Search } from 'lucide-react';
import { optimizeImageForAnalysis } from '../utils/imageOptimizer';

interface CardCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardIdentified: (cardData: any) => void;
}

export const CardCameraModal: React.FC<CardCameraModalProps> = ({
  isOpen,
  onClose,
  onCardIdentified,
}) => {
  const [streamActive, setStreamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start environment (back) camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setIsAnalyzing(false);
      setErrorMessage(null);
      setStatusMessage('');
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setErrorMessage(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setStreamActive(true);
      } else {
        setStreamActive(false);
      }
    } catch (err: any) {
      console.warn('Direct camera stream not allowed or available:', err);
      setStreamActive(false);
      // Not a fatal error, file upload / phone native camera capture still works!
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStreamActive(false);
  };

  // Capture current video frame
  const handleSnap = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      stopCamera();
      
      try {
        const optimized = await optimizeImageForAnalysis(rawDataUrl);
        setCapturedImage(optimized);
        analyzeCardImage(optimized);
      } catch {
        setCapturedImage(rawDataUrl);
        analyzeCardImage(rawDataUrl);
      }
    }
  };

  // Handle mobile native camera / file select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopCamera();
    setIsAnalyzing(true);
    setStatusMessage('Otimizando foto do celular para envio rápido...');

    try {
      const optimized = await optimizeImageForAnalysis(file);
      setCapturedImage(optimized);
      analyzeCardImage(optimized);
    } catch (err: any) {
      // Fallback to FileReader if optimization fails
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCapturedImage(dataUrl);
        analyzeCardImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // Send photo to Gemini Vision API endpoint
  const analyzeCardImage = async (base64Image: string) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setStatusMessage('Enviando foto para a IA da Galera Geek...');

    try {
      setStatusMessage('Reconhecendo nome, coleção, raridade e número do card...');
      
      const response = await fetch('/api/identify-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: 'image/jpeg',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Não foi possível identificar o card na foto.');
      }

      setStatusMessage('Buscando imagem oficial em alta definição e cotação mais barata na Liga...');
      
      // Successfully identified card!
      setTimeout(() => {
        onCardIdentified(data.card);
        onClose();
      }, 700);

    } catch (err: any) {
      console.error('Error identifying card:', err);
      setErrorMessage(err.message || 'Falha ao analisar a foto. Tente novamente ou use a busca por nome.');
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Escanear Card com a Câmera</h3>
              <p className="text-[11px] text-slate-400">Identificação automática e cotação na Liga</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isAnalyzing}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Capture area */}
        <div className="relative flex-1 bg-black min-h-[300px] flex items-center justify-center overflow-hidden">
          {/* Active Video Stream */}
          {streamActive && !capturedImage && (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover max-h-[380px]"
              />

              {/* Card Target Guideline Overlay */}
              <div className="absolute inset-8 pointer-events-none border-2 border-amber-400/70 border-dashed rounded-2xl flex flex-col items-center justify-between p-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <span className="bg-slate-950/80 px-3 py-1 rounded-full text-[10px] font-bold text-amber-300 backdrop-blur-sm border border-amber-500/30">
                  Enquadre o Card aqui
                </span>
                <span className="text-[10px] text-slate-300 bg-slate-950/70 px-2 py-0.5 rounded">
                  Mantenha o título bem legível
                </span>
              </div>
            </div>
          )}

          {/* Captured Preview */}
          {capturedImage && (
            <div className="relative w-full h-full flex items-center justify-center bg-slate-950 p-4">
              <img
                src={capturedImage}
                alt="Card capturado"
                className="max-h-[340px] max-w-full rounded-2xl object-contain border border-slate-700 shadow-lg"
              />

              {/* Analysis Overlay */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                  <div className="relative mb-4">
                    <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin flex items-center justify-center" />
                    <Sparkles className="w-6 h-6 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <h4 className="font-bold text-white text-sm mb-1">IA Analisando o Card</h4>
                  <p className="text-xs text-amber-300 font-medium max-w-xs">{statusMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* Fallback if camera stream couldn't start */}
          {!streamActive && !capturedImage && (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                <Camera className="w-8 h-8" />
              </div>
              <div className="max-w-xs mx-auto">
                <p className="text-xs text-slate-300 font-semibold mb-1">
                  Tire uma foto do card pelo celular
                </p>
                <p className="text-[11px] text-slate-500">
                  Ao clicar abaixo, a câmera do seu celular será aberta automaticamente para você fotografar o card.
                </p>
              </div>

              <label className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg transition-transform active:scale-95">
                <Camera className="w-4 h-4" />
                <span>Abrir Câmera do Celular</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Error notification if any */}
        {errorMessage && (
          <div className="px-5 py-3 bg-rose-500/10 border-t border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
            <button
              onClick={() => {
                setCapturedImage(null);
                setErrorMessage(null);
                startCamera();
              }}
              className="underline font-bold text-rose-200 hover:text-white"
            >
              Tentar de novo
            </button>
          </div>
        )}

        {/* Modal Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          {streamActive && !capturedImage ? (
            <>
              {/* Fallback to native camera file picker */}
              <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Galeria / Arquivo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Shutter Button */}
              <button
                type="button"
                onClick={handleSnap}
                className="flex-1 max-w-[200px] mx-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-transform active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>Fotografar Card</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
            </>
          ) : capturedImage && !isAnalyzing ? (
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setCapturedImage(null);
                  setErrorMessage(null);
                  startCamera();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tirar Outra Foto</span>
              </button>

              <button
                type="button"
                onClick={() => analyzeCardImage(capturedImage)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Analisar Novamente</span>
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isAnalyzing}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold disabled:opacity-40"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
