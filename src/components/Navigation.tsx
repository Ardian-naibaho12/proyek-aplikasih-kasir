import React from 'react';
import {
  ShoppingCart,
  ScanLine,
  Package,
  ReceiptText,
  BarChart3,
  Settings,
  AlertTriangle,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

export type ActiveTab = 'cashier' | 'stockOpname' | 'inventory' | 'expenses' | 'analytics' | 'settings';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  depletedCount: number;
  onOpenScanner: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  depletedCount,
  onOpenScanner,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'cashier', label: 'Kasir POS', icon: ShoppingCart },
    { id: 'stockOpname', label: 'Hitung Stok (Scan HP)', icon: ScanLine },
    { id: 'inventory', label: 'Stok Barang', icon: Package },
    {
      id: 'expenses',
      label: 'Pengeluaran & Habis',
      icon: ReceiptText,
      badge: depletedCount > 0 ? depletedCount : undefined,
    },
    { id: 'analytics', label: 'Grafik & Laba', icon: BarChart3 },
    { id: 'settings', label: 'Toko & Backup', icon: Settings },
  ];

  return (
    <>
      {/* Desktop / Tablet Header */}
      <header className="sticky top-0 z-40 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Brand Wordmark (Single text element as per Frontend Design Constitution §2) */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg tracking-tight text-white whitespace-nowrap">
                ScanToko
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-neutral-400 font-normal">
                Stok, Kasir &amp; Laba Rugi
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links (Clean single-line text links) */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative px-3.5 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-neutral-800 text-emerald-400 font-semibold'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-0.5 px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] rounded-full font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action: Quick Scan Button */}
          <div className="flex items-center gap-2 shrink-0">
            {depletedCount > 0 && (
              <button
                onClick={() => setActiveTab('expenses')}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs rounded-lg hover:bg-amber-900/50 transition-colors"
                title={`${depletedCount} barang habis/menipis`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="tabular-nums font-mono">{depletedCount}</span>
                <span>Barang Habis</span>
              </button>
            )}

            {/* PWA Install Button */}
            <PWAInstallButton variant="header" />

            <button
              onClick={onOpenScanner}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-semibold text-xs rounded-lg flex items-center gap-2 shadow-sm transition-all whitespace-nowrap shrink-0 active:scale-95"
            >
              <CameraIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Buka Kamera Scan</span>
              <span className="sm:hidden">Scan HP</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Optimized for one-hand phone operation) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 py-1.5 px-2">
        <div className="grid grid-cols-5 gap-0.5">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-lg transition-colors ${
                  isActive ? 'text-emerald-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-2.5 w-4 h-4 bg-amber-500 text-neutral-950 text-[9px] font-bold rounded-full flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 truncate max-w-full leading-tight">
                  {item.id === 'cashier'
                    ? 'Kasir'
                    : item.id === 'stockOpname'
                    ? 'Scan Stok'
                    : item.id === 'inventory'
                    ? 'Barang'
                    : item.id === 'expenses'
                    ? 'Habis'
                    : 'Grafik'}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

const CameraIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);
