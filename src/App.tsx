import React, { useState, useEffect, useCallback } from 'react';
import { Product, SaleTransaction, StoreProfile } from './types';
import { db } from './services/db';
import { soundService } from './services/audio';
import { Navigation, ActiveTab } from './components/Navigation';
import { CashierTab } from './components/CashierTab';
import { StockOpnameTab } from './components/StockOpnameTab';
import { InventoryTab } from './components/InventoryTab';
import { ExpensesTab } from './components/ExpensesTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { SettingsTab } from './components/SettingsTab';
import { CameraScannerModal } from './components/CameraScannerModal';
import { ReceiptModal } from './components/ReceiptModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('cashier');
  const [products, setProducts] = useState<Product[]>([]);
  const [profile, setProfile] = useState<StoreProfile>(db.getStoreProfile());
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [lastCompletedTransaction, setLastCompletedTransaction] = useState<SaleTransaction | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);

  const refreshData = useCallback(() => {
    setProducts(db.getProducts());
    setProfile(db.getStoreProfile());
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const showToast = (text: string, type: 'success' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Depleted count for badge in navigation
  const depletedCount = products.filter((p) => p.stock <= p.minStock).length;

  // Handle scanned barcode from camera
  const handleBarcodeScanned = (scannedCode: string) => {
    const trimmed = scannedCode.trim();
    const product = db.getProductByBarcode(trimmed) || db.getProductById(trimmed);

    if (activeTab === 'stockOpname') {
      // In stock opname mode, keep modal open or close depending on preference,
      // but notify user
      if (product) {
        showToast(`Scan Hitung: ${product.name} (+1)`, 'success');
      } else {
        soundService.playWarningBuzz();
        showToast(`Barcode ${trimmed} belum terdaftar di katalog!`, 'warning');
      }
      return;
    }

    if (activeTab === 'inventory') {
      if (product) {
        showToast(`Ditemukan: ${product.name} (Stok: ${product.stock} ${product.unit})`, 'success');
      } else {
        showToast(`Barcode ${trimmed} baru. Klik "Tambah Barang Baru" untuk mendaftarkan.`, 'warning');
      }
      setIsScannerOpen(false);
      return;
    }

    // Default: Cashier / POS mode
    if (product) {
      if (product.stock <= 0) {
        soundService.playWarningBuzz();
        showToast(`Stok ${product.name} HABIS! Tidak bisa dimasukkan ke kasir.`, 'warning');
      } else {
        showToast(`Masuk Keranjang: ${product.name} (Rp ${product.sellPrice.toLocaleString('id-ID')})`, 'success');
        setActiveTab('cashier');
      }
      setIsScannerOpen(false);
    } else {
      soundService.playWarningBuzz();
      showToast(`Produk dengan barcode ${trimmed} belum terdaftar di toko!`, 'warning');
      setIsScannerOpen(false);
    }
  };

  const handleSaleCompleted = (transaction: SaleTransaction) => {
    setLastCompletedTransaction(transaction);
    refreshData();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans pb-20 lg:pb-8">
      {/* Top Header & Mobile Navigation */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        depletedCount={depletedCount}
        onOpenScanner={() => setIsScannerOpen(true)}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 inset-x-4 z-50 flex justify-center pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md border ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800'
                : 'bg-amber-950/90 text-amber-300 border-amber-800'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-7">
        {activeTab === 'cashier' && (
          <CashierTab
            products={products}
            onOpenScanner={() => setIsScannerOpen(true)}
            onSaleCompleted={handleSaleCompleted}
            onOpenReceipt={(trx) => setLastCompletedTransaction(trx)}
            profile={profile}
          />
        )}

        {activeTab === 'stockOpname' && (
          <StockOpnameTab
            products={products}
            onOpenScanner={() => setIsScannerOpen(true)}
            onRefreshData={refreshData}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryTab
            products={products}
            onOpenScanner={() => setIsScannerOpen(true)}
            onRefreshData={refreshData}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesTab
            products={products}
            onRefreshData={refreshData}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            profile={profile}
            onRefreshData={refreshData}
            onOpenReceipt={(trx) => setLastCompletedTransaction(trx)}
          />
        )}
      </main>

      {/* Camera Barcode Scanner Modal */}
      <CameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title={
          activeTab === 'stockOpname'
            ? 'Scan Hitung Stok Fisik (Stock Opname)'
            : 'Scan Barcode Kamera HP'
        }
        subtitle={
          activeTab === 'stockOpname'
            ? 'Arahkan kamera ke barcode barang di rak untuk menambah jumlah hitungan'
            : 'Arahkan kamera HP ke barcode barang'
        }
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(lastCompletedTransaction)}
        transaction={lastCompletedTransaction}
        profile={profile}
        onClose={() => setLastCompletedTransaction(null)}
      />
    </div>
  );
}
