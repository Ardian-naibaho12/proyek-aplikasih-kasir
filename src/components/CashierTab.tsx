import React, { useState } from 'react';
import { Product, ProductCategory, SaleItem, SaleTransaction, StoreProfile } from '../types';
import { db } from '../services/db';
import { soundService } from '../services/audio';
import {
  Camera,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Banknote,
  QrCode,
  PackageX,
  Sparkles,
  Printer,
  History,
  X,
} from 'lucide-react';

interface CashierTabProps {
  products: Product[];
  onOpenScanner: () => void;
  onSaleCompleted: (transaction: SaleTransaction) => void;
  onOpenReceipt: (transaction: SaleTransaction) => void;
  profile: StoreProfile;
}

export const CashierTab: React.FC<CashierTabProps> = ({
  products,
  onOpenScanner,
  onSaleCompleted,
  onOpenReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'QRIS' | 'Transfer Bank'>('Tunai');
  const [cashPaid, setCashPaid] = useState<number>(0);
  const [customerName, setCustomerName] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const categories: string[] = [
    'Semua',
    'Makanan & Snack',
    'Minuman',
    'Sembako & Dapur',
    'Perawatan & Mandi',
    'Pembersih Rumah',
    'Rokok & Tembakau',
    'Alat Tulis & Lainnya',
  ];

  // Filter products by search and category
  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchQuery;
  });

  const addToCart = (product: Product, qty = 1) => {
    if (product.stock <= 0) {
      soundService.playWarningBuzz();
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const newQty = Math.min(product.stock, existing.quantity + qty);
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: newQty,
                subtotal: newQty * item.sellPrice,
                profit: newQty * (item.sellPrice - item.buyPrice),
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            barcode: product.barcode,
            name: product.name,
            category: product.category,
            unit: product.unit,
            buyPrice: product.buyPrice,
            sellPrice: product.sellPrice,
            quantity: 1,
            subtotal: product.sellPrice,
            profit: product.sellPrice - product.buyPrice,
          },
        ];
      }
    });

    soundService.playScanBeep();
  };

  const updateQuantity = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    const maxStock = product ? product.stock : 999;

    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > maxStock) return item;
            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.sellPrice,
              profit: newQty * (item.sellPrice - item.buyPrice),
            };
          }
          return item;
        })
        .filter(Boolean) as SaleItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCashPaid(0);
    setCustomerName('');
  };

  // Calculations
  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const totalCost = cart.reduce((sum, item) => sum + item.buyPrice * item.quantity, 0);
  const totalProfit = totalAmount - totalCost;
  const change = Math.max(0, cashPaid - totalAmount);

  // Quick cash buttons
  const setQuickCash = (amount: number) => {
    setCashPaid(amount);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'Tunai' && cashPaid > 0 && cashPaid < totalAmount) {
      alert('Jumlah uang tunai kurang dari total belanja.');
      return;
    }

    const transaction: SaleTransaction = {
      id: `trx-${Date.now()}`,
      invoiceNumber: `INV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(
        100 + Math.random() * 900
      )}`,
      timestamp: new Date().toISOString(),
      items: [...cart],
      totalAmount,
      totalCost,
      grossProfit: totalProfit,
      paymentMethod,
      cashPaid: paymentMethod === 'Tunai' ? (cashPaid || totalAmount) : undefined,
      change: paymentMethod === 'Tunai' ? (cashPaid ? change : 0) : undefined,
      customerName: customerName.trim() || undefined,
    };

    db.addSale(transaction);
    soundService.playSuccessChime();
    onSaleCompleted(transaction);
    clearCart();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Product Catalog & Scan Section (Cols 1-7 or 1-8) */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
        {/* Top Control Bar */}
        <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Cari nama barang atau kode barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Buttons: Reprint Receipt & Camera Scanner */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/80 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              title="Buka riwayat transaksi & cetak ulang struk"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Cetak Ulang Struk</span>
              <span className="sm:hidden">Struk</span>
            </button>

            <button
              type="button"
              onClick={onOpenScanner}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 whitespace-nowrap"
            >
              <Camera className="w-4 h-4" />
              <span>Scan Kamera HP</span>
            </button>
          </div>
        </div>

        {/* Categories Pills/Tabs (Interactive buttons) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-neutral-100 text-neutral-950 font-semibold'
                  : 'bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-700/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.map((prod) => {
            const isOutOfStock = prod.stock <= 0;
            const isLowStock = prod.stock > 0 && prod.stock <= prod.minStock;
            const profitPerItem = prod.sellPrice - prod.buyPrice;
            const inCart = cart.find((i) => i.productId === prod.id);

            return (
              <div
                key={prod.id}
                onClick={() => !isOutOfStock && addToCart(prod)}
                className={`relative bg-neutral-900 border rounded-xl p-3 flex flex-col justify-between transition-all select-none cursor-pointer ${
                  isOutOfStock
                    ? 'border-neutral-800 opacity-55 cursor-not-allowed'
                    : inCart
                    ? 'border-emerald-500/80 bg-neutral-900/90 shadow-sm shadow-emerald-950'
                    : 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850'
                }`}
              >
                {/* Status indicator badges */}
                <div className="flex items-start justify-between gap-1 mb-1.5">
                  <span className="text-[10px] text-neutral-400 font-mono truncate max-w-[100px]">
                    {prod.barcode.slice(-6)}
                  </span>
                  {isOutOfStock ? (
                    <span className="text-[10px] text-red-400 font-medium flex items-center gap-0.5">
                      <PackageX className="w-3 h-3" />
                      Habis
                    </span>
                  ) : isLowStock ? (
                    <span className="text-[10px] text-amber-400 font-medium">
                      Sisa {prod.stock}
                    </span>
                  ) : (
                    <span className="text-[10px] text-neutral-400">
                      Stok: {prod.stock} {prod.unit}
                    </span>
                  )}
                </div>

                {/* Product Name */}
                <h4 className="font-semibold text-xs text-neutral-100 line-clamp-2 leading-snug mb-2">
                  {prod.name}
                </h4>

                {/* Price & Profit */}
                <div className="mt-auto pt-2 border-t border-neutral-800/80 flex items-end justify-between">
                  <div>
                    <div className="text-xs font-bold text-white tabular-nums">
                      Rp {prod.sellPrice.toLocaleString('id-ID')}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono mt-0.5 flex items-center gap-0.5">
                      <TrendingUp className="w-2.5 h-2.5" />
                      +Rp {profitPerItem.toLocaleString('id-ID')}
                    </div>
                  </div>

                  {inCart ? (
                    <span className="w-6 h-6 rounded-md bg-emerald-500 text-neutral-950 font-bold text-xs flex items-center justify-center">
                      {inCart.quantity}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      className="w-6 h-6 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors disabled:opacity-30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-12 text-center text-neutral-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Tidak ada produk yang cocok dengan pencarian.</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart & Checkout Panel (Cols 8-12) */}
      <div className="lg:col-span-5 xl:col-span-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
        {/* Cart Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div>
            <h3 className="font-bold text-neutral-100 text-sm">Keranjang Transaksi</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              {cart.length} jenis item ({cart.reduce((s, i) => s + i.quantity, 0)} pcs)
            </p>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-neutral-400 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan</span>
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
          {cart.map((item) => (
            <div
              key={item.productId}
              className="p-2.5 bg-neutral-850 rounded-xl border border-neutral-800 flex items-center justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-neutral-200 truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400 font-mono">
                  <span>Rp {item.sellPrice.toLocaleString('id-ID')}</span>
                  <span>·</span>
                  <span className="text-emerald-400">+Rp {item.profit.toLocaleString('id-ID')} laba</span>
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => updateQuantity(item.productId, -1)}
                  className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center text-xs font-bold text-white tabular-nums">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.productId, 1)}
                  className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="p-1 text-neutral-500 hover:text-red-400 transition-colors ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="py-8 text-center text-neutral-500">
              <Camera className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
              <p className="text-xs font-medium text-neutral-400">Keranjang masih kosong</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Scan barcode barang atau pilih produk dari katalog.
              </p>
            </div>
          )}
        </div>

        {/* Real-time Profit & Cost Breakdown */}
        {cart.length > 0 && (
          <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Keuntungan Bersih Transaksi:
              </span>
              <span className="tabular-nums font-mono font-bold">
                + Rp {totalProfit.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-neutral-400">
              <span>Modal Kulakan (HPP):</span>
              <span className="font-mono">Rp {totalCost.toLocaleString('id-ID')}</span>
            </div>
          </div>
        )}

        {/* Customer Name Field */}
        <div>
          <label className="block text-[11px] font-medium text-neutral-400 mb-1">
            Nama Pelanggan (Opsional)
          </label>
          <input
            type="text"
            placeholder="Contoh: Bu Siti / Umum"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
            Metode Pembayaran
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'Tunai', icon: Banknote },
              { id: 'QRIS', icon: QrCode },
              { id: 'Transfer Bank', icon: CreditCard },
            ].map((method) => {
              const Icon = method.icon;
              const isSelected = paymentMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id as 'Tunai' | 'QRIS' | 'Transfer Bank')}
                  className={`py-2 px-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1 border transition-colors ${
                    isSelected
                      ? 'bg-neutral-100 text-neutral-950 border-white font-semibold'
                      : 'bg-neutral-800/60 text-neutral-300 border-neutral-700/60 hover:bg-neutral-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="truncate">{method.id}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cash Calculation (if Tunai) */}
        {paymentMethod === 'Tunai' && cart.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-neutral-400">
                Uang Diterima (Rp)
              </label>
              <button
                type="button"
                onClick={() => setQuickCash(totalAmount)}
                className="text-[11px] text-emerald-400 hover:underline"
              >
                Uang Pas
              </button>
            </div>
            <input
              type="number"
              value={cashPaid || ''}
              placeholder={`Rp ${totalAmount.toLocaleString('id-ID')}`}
              onChange={(e) => setCashPaid(Number(e.target.value))}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
            />

            {/* Quick Denominations */}
            <div className="flex flex-wrap gap-1">
              {[10000, 20000, 50000, 100000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setQuickCash(amt)}
                  className="px-2 py-1 text-[10px] bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300 font-mono transition-colors"
                >
                  {amt.toLocaleString('id-ID')}
                </button>
              ))}
            </div>

            {cashPaid > 0 && (
              <div className="flex justify-between text-xs pt-1 text-neutral-300">
                <span>Kembalian:</span>
                <span className={`font-mono font-bold ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  Rp {change.toLocaleString('id-ID')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Total & Checkout Button */}
        <div className="pt-2 border-t border-neutral-800 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-neutral-400 font-medium">TOTAL BAYAR:</span>
            <span className="text-xl font-bold font-mono text-white tabular-nums">
              Rp {totalAmount.toLocaleString('id-ID')}
            </span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Selesaikan &amp; Cetak Struk</span>
          </button>
        </div>
      </div>

      {/* Modal: Riwayat Transaksi & Cetak Ulang Struk */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-850/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Riwayat Transaksi &amp; Cetak Ulang Struk</h3>
                  <p className="text-xs text-neutral-400">
                    Cari nota lama untuk dicetak ulang kapan saja
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Filter */}
            <div className="p-4 bg-neutral-850 border-b border-neutral-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Cari nomor faktur (INV-...) atau nama pelanggan..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Transaction List */}
            <div className="p-4 overflow-y-auto space-y-3">
              {db
                .getSales()
                .filter((trx) => {
                  const matchInvoice = trx.invoiceNumber.toLowerCase().includes(historySearch.toLowerCase());
                  const matchCust = (trx.customerName || '').toLowerCase().includes(historySearch.toLowerCase());
                  const matchItem = trx.items.some((i) => i.name.toLowerCase().includes(historySearch.toLowerCase()));
                  return matchInvoice || matchCust || matchItem;
                })
                .map((trx) => (
                  <div
                    key={trx.id}
                    className="p-3.5 bg-neutral-850 hover:bg-neutral-800/80 border border-neutral-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-emerald-400">
                          {trx.invoiceNumber}
                        </span>
                        <span className="text-[10px] text-neutral-500">·</span>
                        <span className="text-[11px] text-neutral-400">
                          {new Date(trx.timestamp).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          {new Date(trx.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {trx.customerName && (
                          <span className="px-1.5 py-0.2 bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-300 rounded font-medium">
                            {trx.customerName}
                          </span>
                        )}
                      </div>

                      {/* Items preview */}
                      <p className="text-xs text-neutral-300 mt-1 line-clamp-1">
                        {trx.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                      </p>

                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-mono mt-1">
                        <span>Metode: {trx.paymentMethod}</span>
                        <span>·</span>
                        <span className="text-emerald-400 font-semibold">
                          Laba: +Rp {trx.grossProfit.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800">
                      <div className="text-left sm:text-right">
                        <div className="text-sm font-bold font-mono text-white tabular-nums">
                          Rp {trx.totalAmount.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {trx.items.reduce((s, i) => s + i.quantity, 0)} pcs barang
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsHistoryOpen(false);
                          onOpenReceipt(trx);
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap active:scale-95"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak Struk</span>
                      </button>
                    </div>
                  </div>
                ))}

              {db.getSales().length === 0 && (
                <div className="py-12 text-center text-neutral-500">
                  <Printer className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
                  <p className="text-xs">Belum ada riwayat transaksi penjualan.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
