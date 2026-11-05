import React, { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  Camera,
  X,
  FlipHorizontal,
  Zap,
  ZapOff,
  AlertCircle,
  Keyboard,
  Barcode,
  CheckCircle2,
} from 'lucide-react';
import { soundService } from '../services/audio';
import { db } from '../services/db';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  subtitle?: string;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Barcode Kamera HP',
  subtitle = 'Arahkan kamera ke barcode produk',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Quick test demo barcodes from retail database
  const quickTestProducts = [
    { barcode: '8998866200225', name: 'Indomie Goreng' },
    { barcode: '8992753211115', name: 'Aqua 600ml' },
    { barcode: '8992759100123', name: 'Kopi Kapal Api' },
    { barcode: '8993005121014', name: 'Minyak Bimoli 2L (Habis)' },
    { barcode: '8999999512349', name: 'Sunlight 700ml' },
  ];

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (readerRef.current) {
      // release reader
      readerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const handleScanSuccess = useCallback((resultText: string) => {
    const clean = resultText.trim();
    if (!clean) return;

    soundService.playScanBeep();
    setLastScannedCode(clean);
    onScan(clean);

    // brief cooldown visual feedback before next scan
    setTimeout(() => {
      setLastScannedCode(null);
    }, 1200);
  }, [onScan]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setErrorMessage(null);

    if (!isOpen) return;

    try {
      // Test if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera tidak didukung oleh browser ini.');
      }

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Check if torch/flash is supported
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities?.() as { torch?: boolean } | undefined;
        setHasTorch(Boolean(capabilities?.torch));
      }

      setIsScanning(true);

      // Initialize ZXing Browser Multi Format Reader
      const codeReader = new BrowserMultiFormatReader();
      readerRef.current = codeReader;

      let lastScannedTime = 0;

      // Continuous frame decoder
      codeReader.decodeFromVideoElement(videoRef.current!, (result, err) => {
        if (result) {
          const now = Date.now();
          // Debounce same or fast scans (800ms)
          if (now - lastScannedTime > 800) {
            lastScannedTime = now;
            handleScanSuccess(result.getText());
          }
        }
        if (err && err.name !== 'NotFoundException') {
          // Normal frame not containing barcode, silently continue
        }
      });
    } catch (err: unknown) {
      const e = err as Error;
      setIsScanning(false);
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setErrorMessage('Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser atau gunakan input manual.');
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setErrorMessage('Kamera tidak ditemukan di perangkat ini. Anda dapat memasukkan kode barcode secara manual di bawah.');
      } else {
        setErrorMessage(e.message || 'Gagal memulai pemindai kamera.');
      }
    }
  }, [facingMode, isOpen, stopCamera, handleScanSuccess]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const newTorchState = !torchOn;
      await (track.applyConstraints as (c: unknown) => Promise<void>)({
        advanced: [{ torch: newTorchState }],
      });
      setTorchOn(newTorchState);
    } catch {
      // Torch not supported on some platforms
    }
  };

  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleScanSuccess(manualCode.trim());
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/90 z-10">
          <div>
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-neutral-100 text-base">{title}</h3>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            aria-label="Tutup pemindai"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Camera Area */}
        <div className="relative aspect-4/3 sm:aspect-16/10 bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Scanner Overlay Framing */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Outer dark vignette */}
              <div className="relative w-64 h-48 sm:w-72 sm:h-52 border-2 border-emerald-400/80 rounded-xl overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                {/* Corner reticles */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400" />

                {/* Animated laser scan line */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-scan-line" />
              </div>
              <p className="text-xs text-neutral-300 font-medium mt-3 bg-neutral-900/80 px-3 py-1 rounded-full border border-neutral-700/60 shadow-md">
                Arahkan garis hijau tepat ke garis barcode
              </p>
            </div>
          )}

          {/* Last Scanned Feedback Toast */}
          {lastScannedCode && (
            <div className="absolute inset-x-6 top-6 flex items-center justify-center pointer-events-none animate-in zoom-in-95 duration-150">
              <div className="bg-emerald-500 text-neutral-950 px-4 py-2 rounded-lg font-semibold text-sm shadow-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Barcode Terbaca: {lastScannedCode}</span>
              </div>
            </div>
          )}

          {/* Camera Error / Permission Notice */}
          {errorMessage && (
            <div className="absolute inset-0 bg-neutral-900/95 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
              <h4 className="text-sm font-semibold text-white mb-1">Akses Kamera Bermasalah</h4>
              <p className="text-xs text-neutral-400 max-w-sm mb-4 leading-relaxed">{errorMessage}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Coba Buka Kamera Lagi
              </button>
            </div>
          )}

          {/* Camera Controls Overlay (Top Right) */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-lg backdrop-blur-md transition-colors ${
                  torchOn ? 'bg-amber-400 text-neutral-950' : 'bg-neutral-900/70 text-white hover:bg-neutral-800'
                }`}
                title={torchOn ? 'Matikan Senter' : 'Nyalakan Senter'}
              >
                {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={flipCamera}
              className="p-2 bg-neutral-900/70 text-white hover:bg-neutral-800 rounded-lg backdrop-blur-md transition-colors"
              title="Ganti Kamera Depan/Belakang"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Drawer: Manual Input & Quick Test Barcodes */}
        <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex flex-col gap-3 overflow-y-auto">
          {/* Manual Barcode Input */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Keyboard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Ketik angka barcode atau nama barang..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
            >
              Input
            </button>
          </form>

          {/* Quick Demo Test Barcode Buttons (Useful for quick desktop or emulator testing) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-neutral-400 flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5 text-neutral-400" />
                Klik Contoh Barcode Ritel (Uji Cepat Tanpa Fisik)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickTestProducts.map((item) => (
                <button
                  key={item.barcode}
                  type="button"
                  onClick={() => handleScanSuccess(item.barcode)}
                  className="px-2.5 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/80 text-neutral-200 rounded-md transition-colors text-left flex items-center gap-1.5"
                >
                  <span className="font-mono text-neutral-400 text-[10px]">{item.barcode.slice(-4)}</span>
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
