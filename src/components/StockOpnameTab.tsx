import React, { useState } from 'react';
import { Product, StockAuditLog } from '../types';
import { db } from '../services/db';
import { soundService } from '../services/audio';
import {
  Camera,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Save,
  ScanLine,
  Plus,
  Minus,
  Search,
  History,
  Check,
} from 'lucide-react';

interface StockOpnameTabProps {
  products: Product[];
  onOpenScanner: () => void;
  onRefreshData: () => void;
}

interface CountItem {
  product: Product;
  physicalCount: number;
  lastScannedAt: Date;
}

export const StockOpnameTab: React.FC<StockOpnameTabProps> = ({
  products,
  onOpenScanner,
  onRefreshData,
}) => {
  const [countedItems, setCountedItems] = useState<Record<string, CountItem>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const audits = db.getStockAudits();

  // Helper to add or increment count
  const handleScanItem = (barcodeOrId: string) => {
    const product = db.getProductByBarcode(barcodeOrId) || db.getProductById(barcodeOrId);
    if (!product) {
      soundService.playWarningBuzz();
      return;
    }

    soundService.playScanBeep();

    setCountedItems((prev) => {
      const current = prev[product.id];
      const newCount = current ? current.physicalCount + 1 : 1;
      return {
        ...prev,
        [product.id]: {
          product,
          physicalCount: newCount,
          lastScannedAt: new Date(),
        },
      };
    });
  };

  const updateItemCount = (productId: string, newCount: number) => {
    const val = Math.max(0, newCount);
    setCountedItems((prev) => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          physicalCount: val,
        },
      };
    });
  };

  const addManualItem = (product: Product) => {
    handleScanItem(product.id);
  };

  const handleSaveAllCounts = () => {
    const items = Object.values(countedItems);
    if (items.length === 0) return;

    items.forEach((item) => {
      const discrepancy = item.physicalCount - item.product.stock;
      const log: StockAuditLog = {
        id: `audit-${Date.now()}-${item.product.id}`,
        timestamp: new Date().toISOString(),
        productId: item.product.id,
        productName: item.product.name,
        barcode: item.product.barcode,
        systemStock: item.product.stock,
        physicalCount: item.physicalCount,
        discrepancy,
        notes: discrepancy === 0 ? 'Stok fisik sesuai sistem' : discrepancy < 0 ? 'Stok fisik berkurang' : 'Stok fisik bertambah',
      };
      db.addStockAudit(log);
    });

    soundService.playSuccessChime();
    setSaveSuccessNotice(`Berhasil memperbarui stok ${items.length} barang ke database!`);
    setCountedItems({});
    onRefreshData();

    setTimeout(() => {
      setSaveSuccessNotice(null);
    }, 4000);
  };

  const resetCounting = () => {
    if (confirm('Kosongkan daftar penghitungan saat ini?')) {
      setCountedItems({});
    }
  };

  const countList = Object.values(countedItems);
  const totalPhysicalItems = countList.reduce((sum, item) => sum + item.physicalCount, 0);

  // Filter products for quick add list
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Hero / Action Banner for Mobile Camera Stock Counting */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-850 to-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-1.5">
              <ScanLine className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Fitur Unggulan: Stock Opname Kamera HP
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Hitung Stok Fisik Barang di Rak Tanpa Alat Scanner Khusus
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 leading-relaxed">
              Cukup arahkan kamera HP ke barcode barang di etalase/gudang. Setiap kali scan, jumlah barang akan otomatis bertambah, langsung membandingkan dengan stok sistem toko Anda.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={onOpenScanner}
              className="flex-1 md:flex-none px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Mulai Scan Kamera HP</span>
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-3.5 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Lihat riwayat audit"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Riwayat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccessNotice && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* Main Stock Audit Working Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Counted Items List (Cols 1-8) */}
        <div className="lg:col-span-8 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div>
              <h3 className="font-bold text-neutral-100 text-sm">
                Daftar Barang yang Sedang Dihitung
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {countList.length} jenis barang terhitung · Total {totalPhysicalItems} pcs fisik
              </p>
            </div>
            {countList.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={resetCounting}
                  className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white flex items-center gap-1 rounded bg-neutral-800 hover:bg-neutral-750 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={handleSaveAllCounts}
                  className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Update ke Database</span>
                </button>
              </div>
            )}
          </div>

          {/* Items Table/Cards */}
          <div className="space-y-3">
            {countList.map((item) => {
              const discrepancy = item.physicalCount - item.product.stock;
              const isMatch = discrepancy === 0;
              const isLess = discrepancy < 0;

              return (
                <div
                  key={item.product.id}
                  className="p-3.5 bg-neutral-850 border border-neutral-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-neutral-400">
                        {item.product.barcode}
                      </span>
                      <span className="text-[10px] text-neutral-500">·</span>
                      <span className="text-[11px] text-neutral-400">{item.product.category}</span>
                    </div>
                    <h4 className="font-semibold text-sm text-neutral-100 mt-0.5 truncate">
                      {item.product.name}
                    </h4>

                    {/* Stock comparison badge */}
                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                      <span className="text-neutral-400">
                        Stok di Sistem: <strong className="text-white font-mono">{item.product.stock}</strong> {item.product.unit}
                      </span>
                      <span>·</span>
                      <span className="text-neutral-400">
                        Fisik Dihitung: <strong className="text-emerald-400 font-mono">{item.physicalCount}</strong> {item.product.unit}
                      </span>
                    </div>
                  </div>

                  {/* Discrepancy & Quick Stepper Controls */}
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800">
                    {/* Discrepancy Status */}
                    <div className="text-left sm:text-right">
                      {isMatch ? (
                        <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                          <span>Cocok (Pas)</span>
                        </div>
                      ) : isLess ? (
                        <div className="inline-flex items-center gap-1 text-xs font-semibold text-red-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Selisih: {discrepancy} (Hilang/Kurang)</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Selisih: +{discrepancy} (Lebih)</span>
                        </div>
                      )}
                    </div>

                    {/* Count Stepper */}
                    <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-700/80 rounded-lg p-1">
                      <button
                        onClick={() => updateItemCount(item.product.id, item.physicalCount - 1)}
                        className="w-7 h-7 rounded bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={item.physicalCount}
                        onChange={(e) => updateItemCount(item.product.id, parseInt(e.target.value, 10) || 0)}
                        className="w-12 text-center bg-transparent text-sm font-bold font-mono text-white focus:outline-none"
                      />
                      <button
                        onClick={() => updateItemCount(item.product.id, item.physicalCount + 1)}
                        className="w-7 h-7 rounded bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {countList.length === 0 && (
              <div className="py-12 text-center text-neutral-500">
                <ScanLine className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-400" />
                <h4 className="text-sm font-semibold text-neutral-300">Belum Ada Barang yang Dihitung</h4>
                <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1 leading-relaxed">
                  Buka kamera HP dan scan barcode produk di etalase, atau klik tombol barang di panel samping untuk menambahkan hitungan.
                </p>
                <button
                  onClick={onOpenScanner}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold rounded-lg text-xs inline-flex items-center gap-1.5 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span>Buka Pemindai Barcode Sekarang</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Add / Search Item Panel (Cols 9-12) */}
        <div className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
          <div>
            <h3 className="font-bold text-neutral-100 text-sm">Pencarian Cepat Barang</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Tambah manual jika barcode tidak bisa terbaca kamera
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Ketik nama atau barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* List of products to click & add */}
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const isAlreadyCounting = Boolean(countedItems[p.id]);
              return (
                <div
                  key={p.id}
                  onClick={() => addManualItem(p)}
                  className="p-2.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-800 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-neutral-200 truncate">{p.name}</p>
                    <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                      Stok: {p.stock} {p.unit} · Barcode: {p.barcode.slice(-6)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`px-2 py-1 text-[11px] rounded font-medium flex items-center gap-1 ${
                      isAlreadyCounting
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-neutral-800 text-neutral-300 hover:text-white'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isAlreadyCounting ? '+1 Lagi' : 'Hitung'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* History Modal / Drawer */}
      {showHistory && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
            <div>
              <h3 className="font-bold text-neutral-100 text-sm">Riwayat Hitung Stok (Audit Log)</h3>
              <p className="text-xs text-neutral-400 mt-0.5">Catatan audit fisik yang pernah dilakukan</p>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs text-neutral-400 hover:text-white"
            >
              Tutup Riwayat
            </button>
          </div>

          {audits.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-6">
              Belum ada riwayat audit stok yang tersimpan.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400">
                    <th className="py-2 px-3">Waktu</th>
                    <th className="py-2 px-3">Nama Barang</th>
                    <th className="py-2 px-3 text-right">Stok Sistem</th>
                    <th className="py-2 px-3 text-right">Hitung Fisik</th>
                    <th className="py-2 px-3 text-right">Selisih</th>
                    <th className="py-2 px-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {audits.map((a) => (
                    <tr key={a.id} className="hover:bg-neutral-850/50">
                      <td className="py-2.5 px-3 text-neutral-400">
                        {new Date(a.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-neutral-200">{a.productName}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-400">{a.systemStock}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">{a.physicalCount}</td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold ${a.discrepancy === 0 ? 'text-emerald-400' : a.discrepancy < 0 ? 'text-red-400' : 'text-cyan-400'}`}>
                        {a.discrepancy > 0 ? `+${a.discrepancy}` : a.discrepancy}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400">{a.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
