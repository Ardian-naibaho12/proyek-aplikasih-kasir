import React, { useState } from 'react';
import { SaleTransaction, StoreProfile } from '../types';
import {
  Check,
  Printer,
  Share2,
  X,
  Copy,
  Download,
  Settings2,
  Receipt,
  FileText,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';

interface ReceiptModalProps {
  transaction: SaleTransaction | null;
  profile: StoreProfile;
  isOpen: boolean;
  onClose: () => void;
}

export type PaperSize = '58mm' | '80mm' | 'standard';
export type ReceiptCopyMode = 'customer' | 'merchant';

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  profile,
  isOpen,
  onClose,
}) => {
  const [paperSize, setPaperSize] = useState<PaperSize>('58mm');
  const [copyMode, setCopyMode] = useState<ReceiptCopyMode>('customer');
  const [showInvoiceBarcode, setShowInvoiceBarcode] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const getFormattedReceiptText = () => {
    let text = `================================\n`;
    text += `       ${profile.storeName.toUpperCase()}\n`;
    text += `  ${profile.address}\n`;
    text += `       Telp: ${profile.phone}\n`;
    text += `================================\n`;
    text += `No. Faktur : ${transaction.invoiceNumber}\n`;
    text += `Tanggal    : ${new Date(transaction.timestamp).toLocaleDateString('id-ID')}\n`;
    text += `Waktu      : ${new Date(transaction.timestamp).toLocaleTimeString('id-ID')}\n`;
    if (transaction.customerName) {
      text += `Pelanggan  : ${transaction.customerName}\n`;
    }
    text += `--------------------------------\n`;

    transaction.items.forEach((item) => {
      text += `${item.name}\n`;
      const qtyStr = `${item.quantity} x Rp ${item.sellPrice.toLocaleString('id-ID')}`;
      const subtotalStr = `Rp ${item.subtotal.toLocaleString('id-ID')}`;
      const padding = Math.max(1, 32 - qtyStr.length - subtotalStr.length);
      text += `  ${qtyStr}${' '.repeat(padding)}${subtotalStr}\n`;
    });

    const totalItemCount = transaction.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalItemTypes = transaction.items.length;

    text += `--------------------------------\n`;
    const qtySummary = `${totalItemCount} pcs (${totalItemTypes} item)`;
    text += `Jumlah Barang Dibeli : ${qtySummary}\n`;
    const totalLabel = `TOTAL BELANJA        :`;
    const totalVal = `Rp ${transaction.totalAmount.toLocaleString('id-ID')}`;
    text += `${totalLabel}${' '.repeat(Math.max(1, 32 - totalLabel.length - totalVal.length))}${totalVal}\n`;
    text += `--------------------------------\n`;
    text += `Pembayaran : ${transaction.paymentMethod}\n`;

    if (transaction.cashPaid !== undefined) {
      const bayarVal = `Rp ${transaction.cashPaid.toLocaleString('id-ID')}`;
      text += `Tunai      : ${bayarVal}\n`;
      const kembalianVal = `Rp ${(transaction.change || 0).toLocaleString('id-ID')}`;
      text += `Kembalian  : ${kembalianVal}\n`;
    }

    if (copyMode === 'merchant') {
      text += `--------------------------------\n`;
      text += `[SALINAN PEMILIK / INTERNAL]\n`;
      text += `Modal HPP  : Rp ${transaction.totalCost.toLocaleString('id-ID')}\n`;
      text += `Laba Kotor : +Rp ${transaction.grossProfit.toLocaleString('id-ID')} (${Math.round((transaction.grossProfit / transaction.totalAmount) * 100)}%)\n`;
    }

    text += `================================\n`;
    text += `${profile.receiptFooter}\n`;
    text += `================================\n`;
    return text;
  };

  const handleShareWhatsApp = () => {
    const totalItemCount = transaction.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalItemTypes = transaction.items.length;

    let text = `*STRUK PEMBAYARAN - ${profile.storeName.toUpperCase()}*\n`;
    text += `${profile.address} | Telp: ${profile.phone}\n`;
    text += `No. Faktur: ${transaction.invoiceNumber}\n`;
    text += `Waktu: ${new Date(transaction.timestamp).toLocaleString('id-ID')}\n`;
    if (transaction.customerName) {
      text += `Pelanggan: ${transaction.customerName}\n`;
    }
    text += `--------------------------------\n`;

    transaction.items.forEach((item) => {
      text += `${item.name}\n`;
      text += `  ${item.quantity} x Rp ${item.sellPrice.toLocaleString('id-ID')} = Rp ${item.subtotal.toLocaleString('id-ID')}\n`;
    });

    text += `--------------------------------\n`;
    text += `*Jumlah Barang Dibeli: ${totalItemCount} pcs (${totalItemTypes} item)*\n`;
    text += `*TOTAL BELANJA: Rp ${transaction.totalAmount.toLocaleString('id-ID')}*\n`;
    text += `--------------------------------\n`;
    text += `Metode Pembayaran: ${transaction.paymentMethod}\n`;
    if (transaction.cashPaid) {
      text += `Tunai: Rp ${transaction.cashPaid.toLocaleString('id-ID')}\n`;
      text += `Kembali: Rp ${(transaction.change || 0).toLocaleString('id-ID')}\n`;
    }
    text += `\n_${profile.receiptFooter}_\n`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(getFormattedReceiptText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadTxt = () => {
    const text = getFormattedReceiptText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `struk_${transaction.invoiceNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Simulated invoice barcode generator
  const renderBarcodeLines = (str: string) => {
    return (
      <div className="flex items-center justify-center gap-0.5 my-2">
        {str.split('').map((char, i) => {
          const width = (char.charCodeAt(0) % 3) + 1.2;
          return (
            <div
              key={i}
              style={{ width: `${width}px`, height: '28px' }}
              className="bg-black shrink-0"
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-850/80 no-print">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Cetak Struk Pembayaran</h3>
              <p className="text-[11px] text-neutral-400">
                Faktur: <span className="font-mono text-neutral-300">{transaction.invoiceNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options & Print Controls Toolbar (Screen only) */}
        <div className="p-4 bg-neutral-850 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
          {/* Paper Size Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400 text-[11px] font-medium">Ukuran Kertas:</span>
            <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-700/80">
              <button
                type="button"
                onClick={() => setPaperSize('58mm')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  paperSize === '58mm'
                    ? 'bg-neutral-100 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Format kertas kasir printer Bluetooth mini 58mm"
              >
                Thermal 58mm
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('80mm')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  paperSize === '80mm'
                    ? 'bg-neutral-100 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Format kertas kasir standar supermarket 80mm"
              >
                Thermal 80mm
              </button>
              <button
                type="button"
                onClick={() => setPaperSize('standard')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  paperSize === 'standard'
                    ? 'bg-neutral-100 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Kertas Biasa / Printer Kantor A4"
              >
                A4 / Biasa
              </button>
            </div>
          </div>

          {/* Copy Mode Toggle (Customer vs Merchant/Owner) */}
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-400 text-[11px] font-medium">Salinan:</span>
            <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-700/80">
              <button
                type="button"
                onClick={() => setCopyMode('customer')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  copyMode === 'customer'
                    ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Struk untuk pembeli (tanpa info margin laba toko)"
              >
                <UserCheck className="w-3 h-3" />
                <span>Pelanggan</span>
              </button>
              <button
                type="button"
                onClick={() => setCopyMode('merchant')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  copyMode === 'merchant'
                    ? 'bg-amber-400 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Struk untuk arsip toko (dilengkapi catatan modal & laba kotor)"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Toko (Laba)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Printable Receipt Paper Container (Viewed in center) */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-neutral-950/80 flex justify-center items-start">
          <div
            id="printable-receipt-area"
            className={`bg-white text-neutral-900 p-5 sm:p-6 rounded-xl border border-neutral-300 shadow-xl font-mono transition-all select-all ${
              paperSize === '58mm'
                ? 'paper-58mm max-w-[275px] text-[11px]'
                : paperSize === '80mm'
                ? 'paper-80mm max-w-[340px] text-xs'
                : 'max-w-md text-xs w-full'
            }`}
          >
            {/* Header: Store Info */}
            <div className="text-center pb-3 border-b border-dashed border-neutral-400">
              <h2 className="font-bold text-sm sm:text-base text-neutral-900 tracking-tight leading-tight uppercase">
                {profile.storeName}
              </h2>
              <p className="text-[11px] text-neutral-700 mt-1 leading-snug">{profile.address}</p>
              <p className="text-[11px] text-neutral-700">Telp: {profile.phone}</p>
            </div>

            {/* Sub-header / Metadata */}
            <div className="py-2.5 border-b border-dashed border-neutral-400 space-y-1 text-[11px] text-neutral-800">
              <div className="flex justify-between">
                <span>No. Faktur:</span>
                <span className="font-bold">{transaction.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{new Date(transaction.timestamp).toLocaleDateString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu:</span>
                <span>{new Date(transaction.timestamp).toLocaleTimeString('id-ID')}</span>
              </div>
              {transaction.customerName && (
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span className="font-semibold">{transaction.customerName}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600 text-[10px]">
                <span>Salinan:</span>
                <span className="font-semibold uppercase">
                  {copyMode === 'customer' ? 'Struk Pembeli' : 'Struk Toko (Arsip)'}
                </span>
              </div>
            </div>

            {/* Itemized Line Items */}
            <div className="py-3 border-b border-dashed border-neutral-400 space-y-2">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-bold text-neutral-900 leading-tight">
                    {item.name}
                  </div>
                  <div className="flex justify-between text-neutral-700 text-[11px]">
                    <span>
                      {item.quantity} x Rp {item.sellPrice.toLocaleString('id-ID')}
                    </span>
                    <span className="font-bold text-neutral-900 tabular-nums">
                      Rp {item.subtotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals & Payments: Disatukan Jumlah Barang yang Dibeli & Totalnya */}
            <div className="py-2.5 border-b border-dashed border-neutral-400 space-y-2">
              <div className="p-2.5 bg-neutral-100 border border-neutral-300 rounded-lg space-y-1">
                <div className="flex justify-between text-neutral-800 text-[11px]">
                  <span>Jumlah Barang Dibeli:</span>
                  <span className="font-bold text-neutral-900 tabular-nums">
                    {transaction.items.reduce((sum, item) => sum + item.quantity, 0)} pcs ({transaction.items.length} jenis)
                  </span>
                </div>
                <div className="flex justify-between font-bold text-neutral-950 text-sm sm:text-base border-t border-dashed border-neutral-300 pt-1.5">
                  <span>TOTAL BELANJA:</span>
                  <span className="tabular-nums">
                    Rp {transaction.totalAmount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="flex justify-between text-neutral-700 text-[11px] pt-0.5">
                <span>Metode Pembayaran:</span>
                <span className="font-semibold text-neutral-900">{transaction.paymentMethod}</span>
              </div>
              {transaction.cashPaid !== undefined && (
                <>
                  <div className="flex justify-between text-neutral-700 text-[11px]">
                    <span>Uang Tunai:</span>
                    <span className="tabular-nums">Rp {transaction.cashPaid.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-neutral-700 text-[11px]">
                    <span>Kembalian:</span>
                    <span className="font-bold text-neutral-900 tabular-nums">
                      Rp {(transaction.change || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Merchant-Only Audit Profit Box (Only shown if copyMode === 'merchant') */}
            {copyMode === 'merchant' && (
              <div className="my-2.5 p-2 bg-amber-50 border border-amber-300 rounded text-neutral-900 text-[10px] space-y-1">
                <div className="font-bold text-amber-900 text-[11px] flex items-center justify-between">
                  <span>CATATAN LABA (INTERNAL TOKO):</span>
                  <span className="text-emerald-700 font-mono font-bold">
                    +Rp {transaction.grossProfit.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-700">
                  <span>Total Modal HPP:</span>
                  <span>Rp {transaction.totalCost.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-neutral-700">
                  <span>Persentase Margin:</span>
                  <span>{Math.round((transaction.grossProfit / transaction.totalAmount) * 100)}%</span>
                </div>
              </div>
            )}

            {/* Optional Invoice Barcode */}
            {showInvoiceBarcode && (
              <div className="pt-2 text-center">
                {renderBarcodeLines(transaction.invoiceNumber)}
                <span className="text-[9px] text-neutral-600 font-mono tracking-widest">
                  {transaction.invoiceNumber}
                </span>
              </div>
            )}

            {/* Footer Message */}
            <div className="text-center pt-3 text-[10px] text-neutral-700 leading-tight">
              {profile.receiptFooter}
            </div>
            <div className="text-center text-[9px] text-neutral-500 mt-2">
              *** Layanan Kasir ScanToko ***
            </div>
          </div>
        </div>

        {/* Action Buttons Footer (Screen only) */}
        <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2.5 no-print">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Salin teks struk"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
            </button>
            <button
              onClick={handleDownloadTxt}
              className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Download file struk .txt"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unduh .txt</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Bagikan ke WhatsApp Pelanggan"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Kirim WA</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-lg text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Struk Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
