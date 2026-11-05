import React, { useState } from 'react';
import { Product, ProductCategory } from '../types';
import { db } from '../services/db';
import { soundService } from '../services/audio';
import { BarcodeCard } from './BarcodeCard';
import {
  Package,
  Plus,
  Search,
  Camera,
  Edit2,
  Trash2,
  Barcode as BarcodeIcon,
  AlertTriangle,
  PackageX,
  CheckCircle2,
  TrendingUp,
  X,
  Printer,
  Sparkles,
} from 'lucide-react';

interface InventoryTabProps {
  products: Product[];
  onOpenScanner: () => void;
  onRefreshData: () => void;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({
  products,
  onOpenScanner,
  onRefreshData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'semua' | 'habis' | 'menipis' | 'aman'>('semua');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [barcodePreviewProduct, setBarcodePreviewProduct] = useState<Product | null>(null);

  // Form states for Add/Edit
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('Sembako & Dapur');
  const [formBuyPrice, setFormBuyPrice] = useState<number>(0);
  const [formSellPrice, setFormSellPrice] = useState<number>(0);
  const [formStock, setFormStock] = useState<number>(0);
  const [formMinStock, setFormMinStock] = useState<number>(5);
  const [formUnit, setFormUnit] = useState('pcs');
  const [formDescription, setFormDescription] = useState('');

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

  // Quick stats
  const totalItemsCount = products.length;
  const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const totalAssetValue = products.reduce((sum, p) => sum + p.stock * p.buyPrice, 0);
  const depletedCount = products.filter((p) => p.stock <= 0).length;
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;

  // Filtered list
  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchQuery.toLowerCase());

    let matchStatus = true;
    if (filterStatus === 'habis') matchStatus = p.stock <= 0;
    else if (filterStatus === 'menipis') matchStatus = p.stock > 0 && p.stock <= p.minStock;
    else if (filterStatus === 'aman') matchStatus = p.stock > p.minStock;

    return matchCategory && matchQuery && matchStatus;
  });

  const openAddModal = (initialBarcode = '') => {
    setEditingProduct(null);
    setFormBarcode(initialBarcode || `899${Math.floor(1000000000 + Math.random() * 9000000000)}`);
    setFormName('');
    setFormCategory('Sembako & Dapur');
    setFormBuyPrice(10000);
    setFormSellPrice(12500);
    setFormStock(10);
    setFormMinStock(5);
    setFormUnit('pcs');
    setFormDescription('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormBarcode(prod.barcode);
    setFormName(prod.name);
    setFormCategory(prod.category);
    setFormBuyPrice(prod.buyPrice);
    setFormSellPrice(prod.sellPrice);
    setFormStock(prod.stock);
    setFormMinStock(prod.minStock);
    setFormUnit(prod.unit);
    setFormDescription(prod.description || '');
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBarcode.trim() || !formName.trim()) {
      alert('Nama barang dan barcode wajib diisi.');
      return;
    }

    const newProd: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      barcode: formBarcode.trim(),
      name: formName.trim(),
      category: formCategory,
      buyPrice: Number(formBuyPrice) || 0,
      sellPrice: Number(formSellPrice) || 0,
      stock: Number(formStock) || 0,
      minStock: Number(formMinStock) || 0,
      unit: formUnit.trim() || 'pcs',
      description: formDescription.trim() || undefined,
      lastRestockedAt: editingProduct?.lastRestockedAt || new Date().toISOString().slice(0, 10),
    };

    db.saveProduct(newProd);
    soundService.playSuccessChime();
    setIsAddModalOpen(false);
    onRefreshData();
  };

  const handleDeleteProduct = (prod: Product) => {
    if (confirm(`Hapus "${prod.name}" dari katalog barang?`)) {
      db.deleteProduct(prod.id);
      onRefreshData();
    }
  };

  const handleQuickAdjust = (prod: Product, delta: number) => {
    db.adjustStock(prod.id, delta);
    soundService.playScanBeep();
    onRefreshData();
  };

  return (
    <div className="space-y-6">
      {/* Top Inventory Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Total Produk Katalog</span>
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white tabular-nums">
            {totalItemsCount} <span className="text-xs font-normal text-neutral-400">item</span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Total fisik: {totalStockUnits.toLocaleString('id-ID')} unit
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Nilai Aset Stok (Modal HPP)</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white tabular-nums truncate">
            Rp {totalAssetValue.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Total modal tersimpan di toko
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Barang Habis (Stok 0)</span>
            <PackageX className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-red-400 tabular-nums">
            {depletedCount} <span className="text-xs font-normal text-neutral-400">item</span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Perlu segera dicatat belanja kulakan
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Barang Menipis</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {lowStockCount} <span className="text-xs font-normal text-neutral-400">item</span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Stok mendekati batas aman
          </p>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama produk atau barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter by Status Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'semua', label: 'Semua Stok' },
            { id: 'habis', label: `Habis (${depletedCount})` },
            { id: 'menipis', label: `Menipis (${lowStockCount})` },
            { id: 'aman', label: 'Aman' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id as typeof filterStatus)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterStatus === st.id
                  ? 'bg-neutral-100 text-neutral-950 font-semibold'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Action: Add Product */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAddModal()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Barang Baru</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Table (Desktop & Tablet) / Cards (Mobile) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-850/60 text-neutral-400 font-medium">
                <th className="py-3 px-4">Nama Produk &amp; Barcode</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-right">Harga Modal (HPP)</th>
                <th className="py-3 px-4 text-right">Harga Jual</th>
                <th className="py-3 px-4 text-right">Margin Laba</th>
                <th className="py-3 px-4 text-center">Stok Saat Ini</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredProducts.map((p) => {
                const profit = p.sellPrice - p.buyPrice;
                const marginPercent = p.sellPrice > 0 ? Math.round((profit / p.sellPrice) * 100) : 0;
                const isOutOfStock = p.stock <= 0;
                const isLowStock = p.stock > 0 && p.stock <= p.minStock;

                return (
                  <tr key={p.id} className="hover:bg-neutral-850/40 transition-colors">
                    {/* Name & Barcode */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-neutral-100 text-sm">{p.name}</div>
                      <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-neutral-400">
                        <span>{p.barcode}</span>
                        <button
                          onClick={() => setBarcodePreviewProduct(p)}
                          className="text-neutral-400 hover:text-emerald-400"
                          title="Lihat &amp; Cetak Barcode"
                        >
                          <BarcodeIcon className="w-3.5 h-3.5 inline" />
                        </button>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-neutral-300">{p.category}</td>

                    {/* Cost */}
                    <td className="py-3.5 px-4 text-right font-mono text-neutral-400">
                      Rp {p.buyPrice.toLocaleString('id-ID')}
                    </td>

                    {/* Sell Price */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      Rp {p.sellPrice.toLocaleString('id-ID')}
                    </td>

                    {/* Margin */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      <span className="text-emerald-400 font-semibold">
                        +Rp {profit.toLocaleString('id-ID')}
                      </span>
                      <div className="text-[10px] text-neutral-400">({marginPercent}%)</div>
                    </td>

                    {/* Stock & Quick +/- Stepper */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-neutral-800/80 rounded-lg p-1 border border-neutral-700/60">
                        <button
                          onClick={() => handleQuickAdjust(p, -1)}
                          disabled={p.stock <= 0}
                          className="w-5 h-5 rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-30 text-white flex items-center justify-center text-xs"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold px-1.5 text-xs text-white tabular-nums">
                          {p.stock}
                        </span>
                        <button
                          onClick={() => handleQuickAdjust(p, 1)}
                          className="w-5 h-5 rounded bg-neutral-700 hover:bg-neutral-600 text-white flex items-center justify-center text-xs"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">{p.unit}</div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                          <PackageX className="w-3 h-3" />
                          Habis
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <AlertTriangle className="w-3 h-3" />
                          Menipis (Min: {p.minStock})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          Aman
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                          title="Edit Produk"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-neutral-800 transition-colors"
                          title="Hapus Produk"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
                    <p className="text-xs">Tidak ada data barang yang sesuai filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
              <h3 className="font-bold text-white text-base">
                {editingProduct ? 'Edit Informasi Barang' : 'Tambah Barang Baru'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Barcode & Scan trigger */}
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Kode Barcode Produk (EAN-13 / Code 128) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="Contoh: 8998866200225"
                    className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      onOpenScanner();
                    }}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-emerald-400 rounded-lg font-semibold flex items-center gap-1.5"
                    title="Scan Barcode via Kamera HP"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan HP</span>
                  </button>
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Nama Barang Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Indomie Goreng Spesial 85g"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Kategori</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ProductCategory)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    {categories.filter((c) => c !== 'Semua').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Satuan</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="pcs / botol / pack / kg / dus"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Pricing: Buy vs Sell */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-850 rounded-xl border border-neutral-800">
                <div>
                  <label className="block text-neutral-400 font-medium mb-1">
                    Harga Modal / Beli (HPP Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formBuyPrice}
                    onChange={(e) => setFormBuyPrice(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-medium mb-1">
                    Harga Jual Eceran (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formSellPrice}
                    onChange={(e) => setFormSellPrice(Number(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="col-span-2 pt-1 flex items-center justify-between text-[11px] text-emerald-400 font-semibold border-t border-neutral-800">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Margin Keuntungan per Satuan:
                  </span>
                  <span className="font-mono">
                    +Rp {(formSellPrice - formBuyPrice).toLocaleString('id-ID')} (
                    {formSellPrice > 0
                      ? Math.round(((formSellPrice - formBuyPrice) / formSellPrice) * 100)
                      : 0}
                    %)
                  </span>
                </div>
              </div>

              {/* Stock & Minimum Threshold */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Jumlah Stok Sekarang
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Batas Minimum (Peringatan Habis)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(Number(e.target.value))}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Catatan / Keterangan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Keterangan letak rak atau kondisi barang..."
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold rounded-lg text-xs shadow-md transition-colors"
                >
                  Simpan Barang ke Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Preview & Print Modal */}
      {barcodePreviewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white text-sm">Label Barcode Produk</h3>
              <button
                onClick={() => setBarcodePreviewProduct(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <BarcodeCard product={barcodePreviewProduct} />

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Label Barcode</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
