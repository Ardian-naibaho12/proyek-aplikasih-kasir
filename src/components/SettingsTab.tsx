import React, { useState } from 'react';
import { StoreProfile } from '../types';
import { db } from '../services/db';
import { soundService } from '../services/audio';
import {
  Settings,
  Download,
  Upload,
  FileSpreadsheet,
  RotateCcw,
  Store,
  Phone,
  MapPin,
  Save,
  CheckCircle,
  HelpCircle,
  Smartphone,
  Printer,
} from 'lucide-react';
import { SaleTransaction } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsTabProps {
  profile: StoreProfile;
  onRefreshData: () => void;
  onOpenReceipt?: (transaction: SaleTransaction) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  profile,
  onRefreshData,
  onOpenReceipt,
}) => {
  const [storeName, setStoreName] = useState(profile.storeName);
  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [phone, setPhone] = useState(profile.phone);
  const [address, setAddress] = useState(profile.address);
  const [receiptFooter, setReceiptFooter] = useState(profile.receiptFooter);
  const [saveNotice, setSaveNotice] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: StoreProfile = {
      ...profile,
      storeName: storeName.trim() || 'Toko Saya',
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      receiptFooter: receiptFooter.trim(),
    };
    db.saveStoreProfile(updated);
    soundService.playSuccessChime();
    setSaveNotice(true);
    onRefreshData();
    setTimeout(() => setSaveNotice(false), 3000);
  };

  const handleDownloadBackup = () => {
    const jsonStr = db.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_scantoko_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = db.importDatabaseJSON(content);
      if (success) {
        soundService.playSuccessChime();
        alert('Data database berhasil dipulihkan dari file backup!');
        onRefreshData();
      } else {
        alert('Format file backup tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  const handleExportCSV = (type: 'products' | 'sales' | 'expenses') => {
    const csv = db.exportCSV(type);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetDemo = () => {
    if (confirm('Kembalikan semua data ke contoh ritel default? Data custom saat ini akan digantikan.')) {
      db.resetToDemoData();
      soundService.playSuccessChime();
      onRefreshData();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* PWA Download / Install Promotional Card */}
      <PWAInstallButton variant="card" />

      {/* Phone Camera Scanning Guide Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">
            Cara Menghitung Barang Hanya Menggunakan Kamera HP
          </h3>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
            Aplikasi ini dirancang 100% tanpa perlu mesin scan barcode pistol eksternal:
          </p>
          <ul className="text-xs text-neutral-300 mt-2 space-y-1 list-disc list-inside">
            <li>Buka tombol <strong>Scan HP</strong> di pojok atas atau navigasi bawah.</li>
            <li>Arahkan kamera belakang HP ke kode batang (barcode) di bungkus produk.</li>
            <li>Sistem akan berbunyi <em>beep</em> dan langsung mencatat jumlah hitungan, mengurangi stok kasir, atau memasukkan ke keranjang belanja.</li>
            <li>Tersedia juga tombol uji coba cepat jika mencoba di komputer/laptop tanpa memegang produk fisik.</li>
          </ul>
        </div>
      </div>

      {/* Store Profile Form */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-400" />
              Profil &amp; Identitas Toko
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Informasi ini akan tercetak pada struk belanja dan laporan
            </p>
          </div>
          {saveNotice && (
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Tersimpan!
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-neutral-300 font-medium mb-1">Nama Toko / Usaha *</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-neutral-300 font-medium mb-1">Nama Pemilik</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-neutral-300 font-medium mb-1">Nomor Telepon / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-neutral-300 font-medium mb-1">Alamat Toko</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-300 font-medium mb-1">Pesan Footer Struk</label>
            <textarea
              rows={2}
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                const sales = db.getSales();
                if (sales.length > 0 && onOpenReceipt) {
                  onOpenReceipt(sales[0]);
                } else if (onOpenReceipt) {
                  const sampleTrx: SaleTransaction = {
                    id: 'sample-print',
                    invoiceNumber: `INV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-SAMPLE`,
                    timestamp: new Date().toISOString(),
                    items: [
                      {
                        productId: 'p-test-1',
                        barcode: '8998866200225',
                        name: 'Indomie Goreng Spesial 85g',
                        category: 'Makanan & Snack',
                        unit: 'pcs',
                        buyPrice: 2800,
                        sellPrice: 3500,
                        quantity: 3,
                        subtotal: 10500,
                        profit: 2100,
                      },
                      {
                        productId: 'p-test-2',
                        barcode: '8992753211115',
                        name: 'Air Mineral Aqua 600ml',
                        category: 'Minuman',
                        unit: 'botol',
                        buyPrice: 2600,
                        sellPrice: 4000,
                        quantity: 2,
                        subtotal: 8000,
                        profit: 2800,
                      },
                    ],
                    totalAmount: 18500,
                    totalCost: 13600,
                    grossProfit: 4900,
                    paymentMethod: 'Tunai',
                    cashPaid: 20000,
                    change: 1500,
                    customerName: 'Pelanggan Uji Coba',
                  };
                  onOpenReceipt(sampleTrx);
                }
              }}
              className="px-3.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Uji Cetak Struk Sampel</span>
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Profil Toko</span>
            </button>
          </div>
        </form>
      </div>

      {/* Database Backup & Export Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="pb-3 border-b border-neutral-800">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            Pencadangan Database &amp; Ekspor Excel
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Seluruh catatan stok, transaksi, keuntungan, dan pengeluaran tersimpan aman di database
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Backup JSON */}
          <div className="p-4 bg-neutral-850 rounded-xl border border-neutral-800 flex flex-col justify-between space-y-3">
            <div>
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <Download className="w-4 h-4 text-emerald-400" />
                Cadangkan Database Lengkap
              </h4>
              <p className="text-neutral-400 mt-1">
                Unduh file backup JSON berisi seluruh katalog produk, riwayat kasir, catatan pengeluaran, dan audit.
              </p>
            </div>
            <button
              onClick={handleDownloadBackup}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Backup (.JSON)</span>
            </button>
          </div>

          {/* Restore JSON */}
          <div className="p-4 bg-neutral-850 rounded-xl border border-neutral-800 flex flex-col justify-between space-y-3">
            <div>
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-cyan-400" />
                Pulihkan dari File Backup
              </h4>
              <p className="text-neutral-400 mt-1">
                Unggah file backup JSON sebelumnya untuk mengembalikan data toko Anda.
              </p>
            </div>
            <label className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Pilih File Backup JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>

          {/* Export CSV Spreadsheets */}
          <div className="p-4 bg-neutral-850 rounded-xl border border-neutral-800 flex flex-col justify-between space-y-3 sm:col-span-2">
            <div>
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                Ekspor Laporan ke Spreadsheet / Excel (.CSV)
              </h4>
              <p className="text-neutral-400 mt-1">
                Buka laporan pembukuan di Microsoft Excel atau Google Sheets untuk pencatatan akuntansi.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => handleExportCSV('products')}
                className="flex-1 min-w-[140px] py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>Katalog Stok CSV</span>
              </button>
              <button
                onClick={() => handleExportCSV('sales')}
                className="flex-1 min-w-[140px] py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>Penjualan Kasir CSV</span>
              </button>
              <button
                onClick={() => handleExportCSV('expenses')}
                className="flex-1 min-w-[140px] py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>Pengeluaran CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Reset Demo Data Button */}
        <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-neutral-300">Reset ke Data Contoh Ritel</p>
            <p className="text-[11px] text-neutral-500">
              Mengisi ulang database dengan produk retail sembako &amp; transaksi contoh
            </p>
          </div>
          <button
            onClick={handleResetDemo}
            className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-400 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
