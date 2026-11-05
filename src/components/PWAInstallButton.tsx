import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card' | 'badge';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already installed and running standalone
  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-center gap-3 text-xs text-emerald-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-bold">Aplikasi Telah Terpasang di Perangkat Ini</p>
            <p className="text-[11px] text-emerald-400/80 mt-0.5">
              Anda sedang menggunakan ScanToko dalam mode aplikasi mandiri (Standalone PWA).
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  // Header compact button
  if (variant === 'header') {
    return (
      <>
        <button
          type="button"
          onClick={handleInstallClick}
          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
          title="Download & pasang aplikasi ini ke HP atau Laptop"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Download Aplikasi</span>
          <span className="sm:hidden">Download</span>
        </button>

        {showGuideModal && (
          <InstallGuideModal
            isIOS={isIOS}
            onClose={() => setShowGuideModal(false)}
          />
        )}
      </>
    );
  }

  // Full Promotional Card (Used in Settings Tab)
  return (
    <>
      <div className="p-4 bg-neutral-850 rounded-xl border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
              <span>Pasang ScanToko di Layar Utama HP</span>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] rounded font-mono font-medium">
                PWA
              </span>
            </h4>
            <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
              Dapat di-download langsung dari browser tanpa perlu download dari Play Store. Aplikasi berjalan cepat seperti aplikasi bawaan dan bisa digunakan tanpa koneksi internet (offline).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleInstallClick}
          className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all whitespace-nowrap active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>{isInstallable ? 'Instal Sekarang' : 'Cara Download di HP'}</span>
        </button>
      </div>

      {showGuideModal && (
        <InstallGuideModal
          isIOS={isIOS}
          onClose={() => setShowGuideModal(false)}
        />
      )}
    </>
  );
};

interface InstallGuideModalProps {
  isIOS: boolean;
  onClose: () => void;
}

const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ isIOS, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {isIOS ? 'Cara Pasang di iPhone / iPad' : 'Cara Pasang di HP Android / Laptop'}
              </h3>
              <p className="text-[11px] text-neutral-400">ScanToko Web App</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Instructions */}
        {isIOS ? (
          <div className="space-y-3 text-xs text-neutral-300">
            <p className="text-neutral-400">
              Di perangkat iOS (Apple Safari), Anda dapat memasang aplikasi ini ke layar utama hanya dalam 3 langkah mudah:
            </p>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3 bg-neutral-850 rounded-xl border border-neutral-800">
                <div className="w-6 h-6 rounded-full bg-neutral-800 text-white font-bold flex items-center justify-center text-xs shrink-0">
                  1
                </div>
                <div>
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    Ketuk tombol Bagikan <Share className="w-3.5 h-3.5 text-cyan-400 inline" />
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Ikon kotak dengan panah ke atas di bagian bawah layar Safari Anda.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-neutral-850 rounded-xl border border-neutral-800">
                <div className="w-6 h-6 rounded-full bg-neutral-800 text-white font-bold flex items-center justify-center text-xs shrink-0">
                  2
                </div>
                <div>
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    Pilih "Tambahkan ke Layar Utama" <PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline" />
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Gulir ke bawah pada menu opsi hingga menemukan "Add to Home Screen".
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-neutral-850 rounded-xl border border-neutral-800">
                <div className="w-6 h-6 rounded-full bg-neutral-800 text-white font-bold flex items-center justify-center text-xs shrink-0">
                  3
                </div>
                <div>
                  <p className="font-semibold text-white">Ketuk "Tambah" (Add)</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Ikon ScanToko akan langsung muncul di layar utama iPhone Anda seperti aplikasi bawaan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-neutral-300">
            <p className="text-neutral-400">
              Di browser Google Chrome pada HP Android atau Laptop:
            </p>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3 bg-neutral-850 rounded-xl border border-neutral-800">
                <div className="w-6 h-6 rounded-full bg-neutral-800 text-white font-bold flex items-center justify-center text-xs shrink-0">
                  1
                </div>
                <div>
                  <p className="font-semibold text-white">Buka Menu Titik Tiga (⋮)</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Di pojok kanan atas browser Google Chrome.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-neutral-850 rounded-xl border border-neutral-800">
                <div className="w-6 h-6 rounded-full bg-neutral-800 text-white font-bold flex items-center justify-center text-xs shrink-0">
                  2
                </div>
                <div>
                  <p className="font-semibold text-white flex items-center gap-1">
                    Pilih "Instal Aplikasi" atau "Tambahkan ke Layar Utama"
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Browser akan membuat ikon aplikasi mandiri tanpa bilah URL browser.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-neutral-850 rounded-xl border border-neutral-800">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-neutral-950 font-bold flex items-center justify-center text-xs shrink-0">
                  ✓
                </div>
                <div>
                  <p className="font-semibold text-white">Selesai!</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Buka ScanToko langsung dari layar utama HP Anda kapan pun Anda ingin menghitung barang atau melayani kasir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Mengerti, Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
