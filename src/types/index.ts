export type ProductCategory =
  | 'Makanan & Snack'
  | 'Minuman'
  | 'Sembako & Dapur'
  | 'Perawatan & Mandi'
  | 'Pembersih Rumah'
  | 'Rokok & Tembakau'
  | 'Alat Tulis & Lainnya';

export type StockStatus = 'aman' | 'menipis' | 'habis';

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: ProductCategory;
  buyPrice: number; // Harga Modal / HPP (Beli)
  sellPrice: number; // Harga Jual
  stock: number; // Stok Saat Ini
  minStock: number; // Batas Stok Menipis/Habis
  unit: string; // pcs, botol, pack, dus, kg, sachet
  lastRestockedAt?: string; // Tanggal terakhir restock
  imageUrl?: string;
  description?: string;
}

export interface SaleItem {
  productId: string;
  barcode: string;
  name: string;
  category: ProductCategory;
  unit: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  subtotal: number;
  profit: number; // (sellPrice - buyPrice) * quantity
}

export interface SaleTransaction {
  id: string;
  invoiceNumber: string;
  timestamp: string; // ISO string
  items: SaleItem[];
  totalAmount: number; // Total harga jual (Omset)
  totalCost: number; // Total HPP modal
  grossProfit: number; // Keuntungan kotor = totalAmount - totalCost
  paymentMethod: 'Tunai' | 'QRIS' | 'Transfer Bank';
  cashPaid?: number;
  change?: number;
  customerName?: string;
  notes?: string;
}

export type ExpenseCategory =
  | 'Belanja Stok (Kulakan Barang Habis)'
  | 'Operasional Toko (Listrik/Air/Internet)'
  | 'Sewa Tempat / Gudang'
  | 'Gaji Karyawan / Jasa'
  | 'Kemasan & Plastik'
  | 'Barang Rusak / Basi / Hilang'
  | 'Lain-lain';

export interface Expense {
  id: string;
  timestamp: string; // ISO string
  category: ExpenseCategory;
  title: string;
  amount: number;
  relatedProductId?: string; // Jika pengeluaran untuk beli barang tertentu
  quantityAdded?: number; // Jika restock, jumlah unit yang ditambah
  unitCost?: number;
  notes?: string;
}

export interface StockAuditLog {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  barcode: string;
  systemStock: number;
  physicalCount: number;
  discrepancy: number; // physicalCount - systemStock
  notes?: string;
}

export interface StoreProfile {
  storeName: string;
  ownerName: string;
  phone: string;
  address: string;
  currency: string;
  receiptFooter: string;
}
