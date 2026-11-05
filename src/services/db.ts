import {
  Product,
  SaleTransaction,
  Expense,
  StockAuditLog,
  StoreProfile,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_TRANSACTIONS,
  INITIAL_EXPENSES,
  INITIAL_STORE_PROFILE,
} from '../data/initialData';

const STORAGE_KEYS = {
  PRODUCTS: 'scantoko_products_v1',
  TRANSACTIONS: 'scantoko_transactions_v1',
  EXPENSES: 'scantoko_expenses_v1',
  AUDIT_LOGS: 'scantoko_audit_logs_v1',
  PROFILE: 'scantoko_profile_v1',
};

class DatabaseService {
  private products: Product[] = [];
  private transactions: SaleTransaction[] = [];
  private expenses: Expense[] = [];
  private auditLogs: StockAuditLog[] = [];
  private profile: StoreProfile = INITIAL_STORE_PROFILE;
  private isLoaded = false;

  constructor() {
    this.init();
  }

  private init(): void {
    if (typeof window === 'undefined') return;

    try {
      const storedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      this.products = storedProducts ? JSON.parse(storedProducts) : [...INITIAL_PRODUCTS];

      const storedTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      this.transactions = storedTransactions ? JSON.parse(storedTransactions) : [...INITIAL_TRANSACTIONS];

      const storedExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      this.expenses = storedExpenses ? JSON.parse(storedExpenses) : [...INITIAL_EXPENSES];

      const storedAudits = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      this.auditLogs = storedAudits ? JSON.parse(storedAudits) : [];

      const storedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
      this.profile = storedProfile ? JSON.parse(storedProfile) : { ...INITIAL_STORE_PROFILE };

      this.isLoaded = true;
    } catch {
      this.products = [...INITIAL_PRODUCTS];
      this.transactions = [...INITIAL_TRANSACTIONS];
      this.expenses = [...INITIAL_EXPENSES];
      this.auditLogs = [];
      this.profile = { ...INITIAL_STORE_PROFILE };
    }
  }

  private persist(key: string, data: unknown): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Ignore quota errors
    }
  }

  // --- PRODUCTS ---
  getProducts(): Product[] {
    if (!this.isLoaded) this.init();
    return [...this.products];
  }

  getProductByBarcode(barcode: string): Product | undefined {
    const trimmed = barcode.trim().toLowerCase();
    return this.products.find(
      (p) => p.barcode.toLowerCase() === trimmed || p.id.toLowerCase() === trimmed
    );
  }

  getProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  saveProduct(product: Product): void {
    const idx = this.products.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      this.products[idx] = product;
    } else {
      this.products.unshift(product);
    }
    this.persist(STORAGE_KEYS.PRODUCTS, this.products);
  }

  deleteProduct(id: string): void {
    this.products = this.products.filter((p) => p.id !== id);
    this.persist(STORAGE_KEYS.PRODUCTS, this.products);
  }

  adjustStock(productId: string, delta: number): Product | undefined {
    const product = this.products.find((p) => p.id === productId);
    if (product) {
      product.stock = Math.max(0, product.stock + delta);
      this.persist(STORAGE_KEYS.PRODUCTS, this.products);
    }
    return product;
  }

  setStock(productId: string, exactStock: number): Product | undefined {
    const product = this.products.find((p) => p.id === productId);
    if (product) {
      product.stock = Math.max(0, exactStock);
      this.persist(STORAGE_KEYS.PRODUCTS, this.products);
    }
    return product;
  }

  // --- SALES TRANSACTIONS ---
  getSales(): SaleTransaction[] {
    if (!this.isLoaded) this.init();
    return [...this.transactions];
  }

  addSale(transaction: SaleTransaction): void {
    // 1. Record sale
    this.transactions.unshift(transaction);
    this.persist(STORAGE_KEYS.TRANSACTIONS, this.transactions);

    // 2. Automatically deduct stock for sold items
    transaction.items.forEach((item) => {
      this.adjustStock(item.productId, -item.quantity);
    });
  }

  // --- EXPENSES ---
  getExpenses(): Expense[] {
    if (!this.isLoaded) this.init();
    return [...this.expenses];
  }

  addExpense(expense: Expense): void {
    this.expenses.unshift(expense);
    this.persist(STORAGE_KEYS.EXPENSES, this.expenses);

    // If this expense is a restock for an existing product and has quantity added
    if (expense.relatedProductId && expense.quantityAdded && expense.quantityAdded > 0) {
      const prod = this.getProductById(expense.relatedProductId);
      if (prod) {
        prod.stock += expense.quantityAdded;
        prod.lastRestockedAt = new Date().toISOString().slice(0, 10);
        if (expense.unitCost && expense.unitCost > 0) {
          prod.buyPrice = expense.unitCost;
        }
        this.saveProduct(prod);
      }
    }
  }

  deleteExpense(id: string): void {
    this.expenses = this.expenses.filter((e) => e.id !== id);
    this.persist(STORAGE_KEYS.EXPENSES, this.expenses);
  }

  // --- STOCK AUDIT (Stock Opname) ---
  getStockAudits(): StockAuditLog[] {
    if (!this.isLoaded) this.init();
    return [...this.auditLogs];
  }

  addStockAudit(log: StockAuditLog): void {
    this.auditLogs.unshift(log);
    this.persist(STORAGE_KEYS.AUDIT_LOGS, this.auditLogs);
    // Also apply physical count to product stock
    this.setStock(log.productId, log.physicalCount);
  }

  // --- STORE PROFILE ---
  getStoreProfile(): StoreProfile {
    if (!this.isLoaded) this.init();
    return { ...this.profile };
  }

  saveStoreProfile(profile: StoreProfile): void {
    this.profile = { ...profile };
    this.persist(STORAGE_KEYS.PROFILE, this.profile);
  }

  // --- ANALYTICS & INSIGHTS ---

  /**
   * Identifies products that are out of stock (stock = 0) or low in stock (stock <= minStock)
   */
  getDepletedProducts(): { product: Product; status: 'habis' | 'menipis'; deficit: number; restockBudget: number }[] {
    return this.products
      .filter((p) => p.stock <= p.minStock)
      .map((p) => {
        const isDepleted = p.stock === 0;
        // target stock is at least minStock * 2 to be safe
        const targetStock = Math.max(p.minStock * 2, 10);
        const deficit = Math.max(0, targetStock - p.stock);
        const restockBudget = deficit * p.buyPrice;
        const statusVal: 'habis' | 'menipis' = isDepleted ? 'habis' : 'menipis';
        return {
          product: p,
          status: statusVal,
          deficit,
          restockBudget,
        };
      })
      .sort((a, b) => {
        // Habis first, then highest budget
        if (a.status === 'habis' && b.status !== 'habis') return -1;
        if (b.status === 'habis' && a.status !== 'habis') return 1;
        return b.restockBudget - a.restockBudget;
      });
  }

  /**
   * Top selling products (Fast-Moving) based on total quantity sold & profit generated
   */
  getTopSellingProducts(limit = 6): {
    product: Product | undefined;
    productId: string;
    name: string;
    category: string;
    barcode: string;
    totalQuantitySold: number;
    totalRevenue: number;
    totalProfit: number;
    marginPercent: number;
  }[] {
    const stats: Record<string, {
      name: string;
      category: string;
      barcode: string;
      qty: number;
      revenue: number;
      profit: number;
    }> = {};

    this.transactions.forEach((trx) => {
      trx.items.forEach((item) => {
        if (!stats[item.productId]) {
          stats[item.productId] = {
            name: item.name,
            category: item.category,
            barcode: item.barcode,
            qty: 0,
            revenue: 0,
            profit: 0,
          };
        }
        stats[item.productId].qty += item.quantity;
        stats[item.productId].revenue += item.subtotal;
        stats[item.productId].profit += item.profit;
      });
    });

    return Object.entries(stats)
      .map(([id, data]) => {
        const product = this.getProductById(id);
        const margin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
        return {
          productId: id,
          product,
          name: data.name,
          category: data.category,
          barcode: data.barcode,
          totalQuantitySold: data.qty,
          totalRevenue: data.revenue,
          totalProfit: data.profit,
          marginPercent: Math.round(margin * 10) / 10,
        };
      })
      .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold)
      .slice(0, limit);
  }

  /**
   * Slow-moving / Dead Stock products:
   * Products that have low or zero sales, but have inventory sitting in stock (capital trapped)
   */
  getSlowMovingProducts(limit = 6): {
    product: Product;
    totalQuantitySold: number;
    capitalTrapped: number; // stock * buyPrice
    daysSinceRestock: number;
    turnoverScore: number; // lower means slower/worse
    suggestedStrategy: string;
  }[] {
    const salesMap: Record<string, number> = {};
    this.transactions.forEach((trx) => {
      trx.items.forEach((item) => {
        salesMap[item.productId] = (salesMap[item.productId] || 0) + item.quantity;
      });
    });

    const now = new Date('2026-11-04T12:00:00Z').getTime();

    const slowProducts = this.products
      .filter((p) => p.stock > 0) // Has unsold stock in store
      .map((p) => {
        const soldQty = salesMap[p.id] || 0;
        const capitalTrapped = p.stock * p.buyPrice;
        
        let daysSinceRestock = 30;
        if (p.lastRestockedAt) {
          const restockTime = new Date(p.lastRestockedAt).getTime();
          daysSinceRestock = Math.max(1, Math.round((now - restockTime) / (1000 * 60 * 60 * 24)));
        }

        // Turnover score: sales per day relative to stock
        const turnoverScore = (soldQty + 0.1) / (p.stock * (daysSinceRestock / 30));

        let suggestedStrategy = 'Diskon Cuci Gudang 15% - 25%';
        if (soldQty === 0) {
          suggestedStrategy = 'Bundling Promo (Pasangkan dengan barang laris seperti Indomie/Aqua)';
        } else if (p.sellPrice > 50000) {
          suggestedStrategy = 'Turunkan Harga Jual mendekati modal atau jual grosir';
        } else {
          suggestedStrategy = 'Pindahkan ke etalase depan kasir & hentikan kulakan ulang';
        }

        return {
          product: p,
          totalQuantitySold: soldQty,
          capitalTrapped,
          daysSinceRestock,
          turnoverScore,
          suggestedStrategy,
        };
      })
      // Sort by slowest (least sold, highest trapped capital)
      .sort((a, b) => {
        if (a.totalQuantitySold === 0 && b.totalQuantitySold > 0) return -1;
        if (b.totalQuantitySold === 0 && a.totalQuantitySold > 0) return 1;
        return b.capitalTrapped - a.capitalTrapped;
      });

    return slowProducts.slice(0, limit);
  }

  /**
   * Overall financial metrics
   */
  getFinancialSummary(): {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    totalExpenses: number;
    restockExpenses: number;
    operationalExpenses: number;
    netProfit: number;
    totalInventoryValue: number; // Modal tertahan di seluruh stok
    totalProductsCount: number;
    depletedCount: number;
  } {
    const totalRevenue = this.transactions.reduce((sum, t) => sum + t.totalAmount, 0);
    const totalCost = this.transactions.reduce((sum, t) => sum + t.totalCost, 0);
    const grossProfit = totalRevenue - totalCost;

    let totalExpenses = 0;
    let restockExpenses = 0;
    let operationalExpenses = 0;

    this.expenses.forEach((e) => {
      totalExpenses += e.amount;
      if (e.category === 'Belanja Stok (Kulakan Barang Habis)') {
        restockExpenses += e.amount;
      } else {
        operationalExpenses += e.amount;
      }
    });

    // Net profit = Gross profit - Operational expenses
    // Note: Restock inventory purchases are capital asset exchanges (cash -> inventory asset),
    // but operational expenses reduce net cash profit directly.
    const netProfit = grossProfit - operationalExpenses;

    const totalInventoryValue = this.products.reduce((sum, p) => sum + p.stock * p.buyPrice, 0);
    const depletedCount = this.products.filter((p) => p.stock <= p.minStock).length;

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      totalExpenses,
      restockExpenses,
      operationalExpenses,
      netProfit,
      totalInventoryValue,
      totalProductsCount: this.products.length,
      depletedCount,
    };
  }

  // --- BACKUP & EXPORT ---
  exportDatabaseJSON(): string {
    const dump = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      profile: this.profile,
      products: this.products,
      transactions: this.transactions,
      expenses: this.expenses,
      auditLogs: this.auditLogs,
    };
    return JSON.stringify(dump, null, 2);
  }

  importDatabaseJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.products)) {
        this.products = data.products;
        this.persist(STORAGE_KEYS.PRODUCTS, this.products);
      }
      if (Array.isArray(data.transactions)) {
        this.transactions = data.transactions;
        this.persist(STORAGE_KEYS.TRANSACTIONS, this.transactions);
      }
      if (Array.isArray(data.expenses)) {
        this.expenses = data.expenses;
        this.persist(STORAGE_KEYS.EXPENSES, this.expenses);
      }
      if (Array.isArray(data.auditLogs)) {
        this.auditLogs = data.auditLogs;
        this.persist(STORAGE_KEYS.AUDIT_LOGS, this.auditLogs);
      }
      if (data.profile) {
        this.profile = data.profile;
        this.persist(STORAGE_KEYS.PROFILE, this.profile);
      }
      return true;
    } catch {
      return false;
    }
  }

  resetToDemoData(): void {
    this.products = [...INITIAL_PRODUCTS];
    this.transactions = [...INITIAL_TRANSACTIONS];
    this.expenses = [...INITIAL_EXPENSES];
    this.auditLogs = [];
    this.profile = { ...INITIAL_STORE_PROFILE };

    this.persist(STORAGE_KEYS.PRODUCTS, this.products);
    this.persist(STORAGE_KEYS.TRANSACTIONS, this.transactions);
    this.persist(STORAGE_KEYS.EXPENSES, this.expenses);
    this.persist(STORAGE_KEYS.AUDIT_LOGS, this.auditLogs);
    this.persist(STORAGE_KEYS.PROFILE, this.profile);
  }

  exportCSV(type: 'products' | 'sales' | 'expenses'): string {
    if (type === 'products') {
      const headers = ['ID', 'Barcode', 'Nama Barang', 'Kategori', 'Harga Modal (HPP)', 'Harga Jual', 'Stok', 'Batas Min', 'Satuan'];
      const rows = this.products.map((p) => [
        p.id,
        p.barcode,
        `"${p.name.replace(/"/g, '""')}"`,
        p.category,
        p.buyPrice,
        p.sellPrice,
        p.stock,
        p.minStock,
        p.unit,
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    if (type === 'sales') {
      const headers = ['No Faktur', 'Waktu', 'Item Terjual', 'Total Omset', 'Total Modal HPP', 'Keuntungan Kotor', 'Metode Bayar'];
      const rows = this.transactions.map((t) => [
        t.invoiceNumber,
        t.timestamp,
        `"${t.items.map((i) => `${i.name} (x${i.quantity})`).join('; ')}"`,
        t.totalAmount,
        t.totalCost,
        t.grossProfit,
        t.paymentMethod,
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    if (type === 'expenses') {
      const headers = ['ID', 'Waktu', 'Kategori', 'Keterangan', 'Jumlah Pengeluaran (Rp)', 'Catatan'];
      const rows = this.expenses.map((e) => [
        e.id,
        e.timestamp,
        `"${e.category}"`,
        `"${e.title.replace(/"/g, '""')}"`,
        e.amount,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    return '';
  }
}

export const db = new DatabaseService();
