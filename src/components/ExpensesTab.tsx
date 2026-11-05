import React, { useState } from 'react';
import { Product, Expense, ExpenseCategory } from '../types';
import { db } from '../services/db';
import { soundService } from '../services/audio';
import {
  ReceiptText,
  AlertTriangle,
  PackageX,
  Plus,
  ShoppingCart,
  Trash2,
  Calendar,
  Wallet,
  Zap,
  CheckCircle2,
  ArrowDownRight,
  TrendingDown,
} from 'lucide-react';

interface ExpensesTabProps {
  products: Product[];
  onRefreshData: () => void;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  products,
  onRefreshData,
}) => {
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [restockProductModal, setRestockProductModal] = useState<Product | null>(null);

  // Form state for general expense
  const [formCategory, setFormCategory] = useState<ExpenseCategory>(
    'Operasional Toko (Listrik/Air/Internet)'
  );
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState<number>(50000);
  const [formNotes, setFormNotes] = useState('');

  // Form state for quick restock
  const [restockQty, setRestockQty] = useState<number>(20);
  const [restockUnitCost, setRestockUnitCost] = useState<number>(0);

  const expenses = db.getExpenses();
  const depletedList = db.getDepletedProducts();

  // Financial calculations
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const restockExpensesTotal = expenses
    .filter((e) => e.category === 'Belanja Stok (Kulakan Barang Habis)')
    .reduce((sum, e) => sum + e.amount, 0);
  const operationalExpensesTotal = totalExpenses - restockExpensesTotal;

  // Total budget needed to restock all depleted & low-stock products to safe level
  const totalRestockBudgetNeeded = depletedList.reduce((sum, item) => sum + item.restockBudget, 0);

  const expenseCategories: ExpenseCategory[] = [
    'Belanja Stok (Kulakan Barang Habis)',
    'Operasional Toko (Listrik/Air/Internet)',
    'Sewa Tempat / Gudang',
    'Gaji Karyawan / Jasa',
    'Kemasan & Plastik',
    'Barang Rusak / Basi / Hilang',
    'Lain-lain',
  ];

  const handleCreateGeneralExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || formAmount <= 0) {
      alert('Keterangan dan jumlah pengeluaran wajib diisi.');
      return;
    }

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      timestamp: new Date().toISOString(),
      category: formCategory,
      title: formTitle.trim(),
      amount: Number(formAmount),
      notes: formNotes.trim() || undefined,
    };

    db.addExpense(newExpense);
    soundService.playSuccessChime();
    setIsAddExpenseOpen(false);
    setFormTitle('');
    setFormNotes('');
    onRefreshData();
  };

  const openRestockModal = (product: Product) => {
    setRestockProductModal(product);
    const deficit = Math.max(product.minStock * 2 - product.stock, 10);
    setRestockQty(deficit);
    setRestockUnitCost(product.buyPrice);
  };

  const handleConfirmRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProductModal || restockQty <= 0) return;

    const totalCost = restockQty * restockUnitCost;

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      timestamp: new Date().toISOString(),
      category: 'Belanja Stok (Kulakan Barang Habis)',
      title: `Kulakan ${restockProductModal.name} (${restockQty} ${restockProductModal.unit})`,
      amount: totalCost,
      relatedProductId: restockProductModal.id,
      quantityAdded: restockQty,
      unitCost: restockUnitCost,
      notes: `Restock otomatis dari sistem barang habis`,
    };

    db.addExpense(newExpense);
    soundService.playSuccessChime();
    setRestockProductModal(null);
    onRefreshData();
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('Hapus catatan pengeluaran ini dari database?')) {
      db.deleteExpense(id);
      onRefreshData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Total Semua Pengeluaran</span>
            <Wallet className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white tabular-nums">
            Rp {totalExpenses.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Tercatat di database sistem
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Belanja Modal Stok (Kulakan)</span>
            <ShoppingCart className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tabular-nums">
            Rp {restockExpensesTotal.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Pengeluaran aset belanja stok barang
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Biaya Operasional Toko</span>
            <Zap className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400 tabular-nums">
            Rp {operationalExpensesTotal.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Listrik, air, sewa, kemasan plastik &amp; susut
          </p>
        </div>
      </div>

      {/* Out of Stock & Depleted Restock Planner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <PackageX className="w-5 h-5 text-red-400" />
              <h3 className="font-bold text-neutral-100 text-base">
                Daftar Barang Habis &amp; Perlu Kulakan
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Otomatis terdeteksi saat stok barang menyentuh 0 atau di bawah batas aman toko
            </p>
          </div>

          {depletedList.length > 0 && (
            <div className="bg-neutral-800/80 border border-neutral-700 rounded-xl px-3.5 py-2 flex items-center gap-3">
              <span className="text-xs text-neutral-400">Estimasi Modal Belanja:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                Rp {totalRestockBudgetNeeded.toLocaleString('id-ID')}
              </span>
            </div>
          )}
        </div>

        {depletedList.length === 0 ? (
          <div className="py-8 text-center text-neutral-500">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400 opacity-80" />
            <h4 className="text-sm font-semibold text-neutral-300">Semua Stok Barang Masih Aman!</h4>
            <p className="text-xs text-neutral-500 mt-0.5">
              Tidak ada barang yang habis atau berada di bawah batas minimum stok saat ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {depletedList.map(({ product, status, deficit, restockBudget }) => (
              <div
                key={product.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  status === 'habis'
                    ? 'bg-red-950/20 border-red-800/40'
                    : 'bg-amber-950/20 border-amber-800/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-mono text-neutral-400">
                      {product.barcode.slice(-6)}
                    </span>
                    {status === 'habis' ? (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold rounded-full">
                        HABIS TOTAL (0 {product.unit})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-semibold rounded-full">
                        Sisa {product.stock} {product.unit} (Min: {product.minStock})
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-neutral-100 line-clamp-2">
                    {product.name}
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Harga Beli Modal: <strong className="font-mono text-white">Rp {product.buyPrice.toLocaleString('id-ID')}</strong>
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-800/60 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-neutral-400">Perlu Kulakan:</div>
                    <div className="text-xs font-bold text-white font-mono">
                      +{deficit} {product.unit} (~Rp {restockBudget.toLocaleString('id-ID')})
                    </div>
                  </div>

                  <button
                    onClick={() => openRestockModal(product)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Catat Kulakan</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* General Expense Tracker Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-neutral-100 text-base">Catatan Pengeluaran Toko</h3>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Catat modal belanja stok, biaya operasional, tagihan listrik, plastik kresek, dan barang rusak
            </p>
          </div>

          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pengeluaran Baru</span>
          </button>
        </div>

        {/* Expenses List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 font-medium">
                <th className="py-2.5 px-3">Tanggal &amp; Waktu</th>
                <th className="py-2.5 px-3">Kategori</th>
                <th className="py-2.5 px-3">Keterangan Pengeluaran</th>
                <th className="py-2.5 px-3">Catatan / Detail</th>
                <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-neutral-850/40 transition-colors">
                  <td className="py-3 px-3 text-neutral-400 whitespace-nowrap">
                    {new Date(exp.timestamp).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    <span className="text-[10px] text-neutral-500">
                      {new Date(exp.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {exp.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-neutral-100">{exp.title}</td>
                  <td className="py-3 px-3 text-neutral-400">{exp.notes || '-'}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-red-400">
                    -Rp {exp.amount.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-neutral-500">
                    Belum ada pengeluaran yang dicatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add General Expense Modal */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-white text-base">Catat Pengeluaran Toko Baru</h3>

            <form onSubmit={handleCreateGeneralExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">Kategori Pengeluaran</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  {expenseCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Keterangan Pengeluaran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beli Kantong Kresek 5 Pack / Token Listrik"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Nominal Pengeluaran (Rp) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(Number(e.target.value))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 font-mono text-white focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Keterangan bon atau nota belanja..."
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold rounded-lg shadow-md"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Restock Modal for Depleted Product */}
      {restockProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-white text-base">
              Catat Kulakan &amp; Tambah Stok
            </h3>
            <p className="text-xs text-neutral-400">
              Mencatat pengeluaran belanja modal kulakan sekaligus menambahkan jumlah stok barang ke database secara otomatis.
            </p>

            <form onSubmit={handleConfirmRestock} className="space-y-3.5 text-xs">
              <div className="p-3 bg-neutral-850 rounded-xl border border-neutral-800">
                <div className="font-bold text-neutral-200 text-sm">{restockProductModal.name}</div>
                <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                  Barcode: {restockProductModal.barcode} · Stok sekarang: {restockProductModal.stock} {restockProductModal.unit}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Jumlah Masuk ({restockProductModal.unit})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={restockQty}
                    onChange={(e) => setRestockQty(Number(e.target.value))}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Harga Modal / Beli Satuan (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={restockUnitCost}
                    onChange={(e) => setRestockUnitCost(Number(e.target.value))}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-3 bg-neutral-800/60 rounded-xl border border-neutral-700 flex items-center justify-between">
                <span className="text-neutral-400">Total Pengeluaran Kulakan:</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  Rp {(restockQty * restockUnitCost).toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setRestockProductModal(null)}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold rounded-lg shadow-md"
                >
                  Konfirmasi &amp; Update Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
