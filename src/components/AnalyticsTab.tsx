import React, { useState } from 'react';
import { db } from '../services/db';
import {
  TrendingUp,
  TrendingDown,
  Flame,
  AlertOctagon,
  DollarSign,
  PieChart as PieIcon,
  ShoppingBag,
  ArrowUpRight,
  Info,
  Calendar,
  Sparkles,
} from 'lucide-react';

export const AnalyticsTab: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'7days' | '30days' | 'all'>('7days');
  const [hoveredDataPoint, setHoveredDataPoint] = useState<{
    date: string;
    revenue: number;
    profit: number;
    expense: number;
  } | null>(null);

  const summary = db.getFinancialSummary();
  const topProducts = db.getTopSellingProducts(6);
  const slowProducts = db.getSlowMovingProducts(6);
  const transactions = db.getSales();
  const expenses = db.getExpenses();

  // Aggregate past 7 days data for timeline chart
  const getLast7DaysData = () => {
    const days: { date: string; label: string; revenue: number; profit: number; expense: number }[] = [];
    const now = new Date('2026-11-04T12:00:00Z');

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });

      // Sum transactions on this date
      const daySales = transactions.filter((t) => t.timestamp.startsWith(dateStr));
      const revenue = daySales.reduce((s, t) => s + t.totalAmount, 0);
      const profit = daySales.reduce((s, t) => s + t.grossProfit, 0);

      // Sum expenses on this date
      const dayExpenses = expenses.filter((e) => e.timestamp.startsWith(dateStr));
      const expense = dayExpenses.reduce((s, e) => s + e.amount, 0);

      days.push({ date: dateStr, label, revenue, profit, expense });
    }
    return days;
  };

  const timelineData = getLast7DaysData();
  const maxTimelineVal = Math.max(
    ...timelineData.map((d) => Math.max(d.revenue, d.profit, d.expense)),
    100000
  );

  // Category breakdown
  const categoryStats: Record<string, { revenue: number; profit: number; count: number }> = {};
  transactions.forEach((t) => {
    t.items.forEach((item) => {
      if (!categoryStats[item.category]) {
        categoryStats[item.category] = { revenue: 0, profit: 0, count: 0 };
      }
      categoryStats[item.category].revenue += item.subtotal;
      categoryStats[item.category].profit += item.profit;
      categoryStats[item.category].count += item.quantity;
    });
  });

  const categoryList = Object.entries(categoryStats).sort((a, b) => b[1].revenue - a[1].revenue);
  const totalCategoryRevenue = categoryList.reduce((sum, [, val]) => sum + val.revenue, 0) || 1;

  // Total modal tertahan di barang susah dijual
  const totalTrappedCapital = slowProducts.reduce((sum, item) => sum + item.capitalTrapped, 0);

  return (
    <div className="space-y-6">
      {/* Top Financial KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Omset */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Total Omset Penjualan</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white tabular-nums truncate">
            Rp {summary.totalRevenue.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Dari {transactions.length} transaksi toko
          </p>
        </div>

        {/* Keuntungan Bersih */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Keuntungan Bersih (Laba Bersih)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tabular-nums truncate">
            +Rp {summary.netProfit.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Margin Bersih: {summary.totalRevenue > 0 ? Math.round((summary.netProfit / summary.totalRevenue) * 100) : 0}% dari omset
          </p>
        </div>

        {/* Total Modal HPP */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Total Modal Pokok (HPP)</span>
            <ShoppingBag className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-neutral-200 tabular-nums truncate">
            Rp {summary.totalCost.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Biaya kulakan barang terjual
          </p>
        </div>

        {/* Modal Tertahan di Barang Macet */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Modal Tertahan Barang Macet</span>
            <AlertOctagon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tabular-nums truncate">
            Rp {totalTrappedCapital.toLocaleString('id-ID')}
          </div>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            {slowProducts.length} produk lambat terjual
          </p>
        </div>
      </div>

      {/* Main Chart 1: Grafik Tren Keuntungan, Omset, dan Pengeluaran */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Grafik Tren Keuntungan &amp; Pengeluaran Toko
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Perbandingan harian antara Omset Penjualan, Laba Bersih, dan Pengeluaran Operasional
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-neutral-300">Omset Penjualan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-cyan-400" />
              <span className="text-neutral-300">Laba Bersih</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-rose-500" />
              <span className="text-neutral-300">Pengeluaran</span>
            </div>
          </div>
        </div>

        {/* SVG Multi-Bar & Line Chart */}
        <div className="relative pt-6 pb-2">
          <div className="h-64 sm:h-72 w-full flex items-end justify-between gap-2 sm:gap-4 px-2">
            {timelineData.map((d, idx) => {
              const revPercent = Math.min(100, Math.round((d.revenue / maxTimelineVal) * 100));
              const profitPercent = Math.min(100, Math.round((d.profit / maxTimelineVal) * 100));
              const expPercent = Math.min(100, Math.round((d.expense / maxTimelineVal) * 100));

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredDataPoint(d)}
                  onMouseLeave={() => setHoveredDataPoint(null)}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                >
                  {/* Bars container */}
                  <div className="w-full max-w-[48px] h-full flex items-end justify-center gap-1 sm:gap-1.5 pb-2 border-b border-neutral-800">
                    {/* Revenue Bar */}
                    <div
                      style={{ height: `${Math.max(6, revPercent)}%` }}
                      className="w-1/3 bg-emerald-500 hover:bg-emerald-400 rounded-t-sm transition-all duration-300 shadow-sm"
                      title={`Omset: Rp ${d.revenue.toLocaleString('id-ID')}`}
                    />
                    {/* Profit Bar */}
                    <div
                      style={{ height: `${Math.max(4, profitPercent)}%` }}
                      className="w-1/3 bg-cyan-400 hover:bg-cyan-300 rounded-t-sm transition-all duration-300 shadow-sm"
                      title={`Laba: Rp ${d.profit.toLocaleString('id-ID')}`}
                    />
                    {/* Expense Bar */}
                    <div
                      style={{ height: `${Math.max(2, expPercent)}%` }}
                      className="w-1/3 bg-rose-500 hover:bg-rose-400 rounded-t-sm transition-all duration-300 shadow-sm"
                      title={`Pengeluaran: Rp ${d.expense.toLocaleString('id-ID')}`}
                    />
                  </div>

                  {/* Day Label */}
                  <span className="text-[10px] sm:text-xs text-neutral-400 mt-2 font-medium truncate max-w-full">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Hover Details Card */}
          {hoveredDataPoint && (
            <div className="absolute top-2 right-4 p-3 bg-neutral-850/95 border border-neutral-700 rounded-xl shadow-2xl text-xs space-y-1 animate-in fade-in z-20 backdrop-blur-md">
              <div className="font-semibold text-white pb-1 border-b border-neutral-700">
                {new Date(hoveredDataPoint.date).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
              <div className="flex justify-between gap-4 text-emerald-400 font-mono">
                <span>Omset Penjualan:</span>
                <span className="font-bold">Rp {hoveredDataPoint.revenue.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between gap-4 text-cyan-400 font-mono">
                <span>Laba Keuntungan:</span>
                <span className="font-bold">Rp {hoveredDataPoint.profit.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between gap-4 text-rose-400 font-mono">
                <span>Total Pengeluaran:</span>
                <span className="font-bold">Rp {hoveredDataPoint.expense.toLocaleString('id-ID')}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Barang Terlaris vs Barang Susah Dijual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 2: BARANG TERLARIS (FAST-MOVING / BANYAK DIBELI ORANG) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">
                  Barang Paling Laris (Banyak Dibeli)
                </h3>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Produk dengan kuantitas penjualan tertinggi &amp; perputaran sangat cepat
              </p>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              FAST-MOVING
            </span>
          </div>

          {/* Bar Chart list */}
          <div className="space-y-3">
            {topProducts.map((p, idx) => {
              const maxSold = topProducts[0]?.totalQuantitySold || 1;
              const barWidthPercent = Math.round((p.totalQuantitySold / maxSold) * 100);

              return (
                <div key={p.productId} className="p-3 bg-neutral-850 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-300 font-bold text-xs flex items-center justify-center font-mono">
                        #{idx + 1}
                      </span>
                      <div>
                        <h4 className="font-semibold text-xs text-neutral-100">{p.name}</h4>
                        <span className="text-[10px] text-neutral-400">{p.category}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-white">
                        {p.totalQuantitySold} <span className="text-xs font-normal text-neutral-400">terjual</span>
                      </span>
                      <div className="text-[10px] text-emerald-400 font-mono">
                        +Rp {p.totalProfit.toLocaleString('id-ID')} laba
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Bar Graphic */}
                  <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${barWidthPercent}%` }}
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-0.5 font-mono">
                    <span>Omset: Rp {p.totalRevenue.toLocaleString('id-ID')}</span>
                    <span>Margin Keuntungan: {p.marginPercent}%</span>
                  </div>
                </div>
              );
            })}

            {topProducts.length === 0 && (
              <p className="py-8 text-center text-neutral-500 text-xs">
                Belum ada data penjualan tercatat.
              </p>
            )}
          </div>
        </div>

        {/* CHART 3: BARANG SUSAH UNTUK DIJUAL (SLOW-MOVING / DEAD STOCK) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  Barang Susah Dijual (Slow-Moving)
                </h3>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Stok macet yang jarang laku, modal tertahan &amp; rekomendasi strategi
              </p>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              PERLU TINDAKAN
            </span>
          </div>

          {/* Slow-moving items with strategy recommendations */}
          <div className="space-y-3">
            {slowProducts.map((p, idx) => (
              <div
                key={p.product.id}
                className="p-3 bg-neutral-850 rounded-xl border border-neutral-800 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-950/60 text-amber-300 font-bold text-xs flex items-center justify-center font-mono border border-amber-800/40">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-xs text-neutral-100">{p.product.name}</h4>
                      <span className="text-[10px] text-neutral-400">
                        Sisa Stok: <strong className="text-white font-mono">{p.product.stock}</strong> {p.product.unit} · Terjual: {p.totalQuantitySold}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400">Modal Tertahan:</span>
                    <div className="font-mono font-bold text-xs text-amber-400">
                      Rp {p.capitalTrapped.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                {/* Strategy recommendation card */}
                <div className="p-2 bg-neutral-900 rounded-lg border border-neutral-800 flex items-start gap-2 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-neutral-300">
                    <strong className="text-amber-300 font-medium">Saran Toko:</strong>{' '}
                    {p.suggestedStrategy}
                  </div>
                </div>
              </div>
            ))}

            {slowProducts.length === 0 && (
              <p className="py-8 text-center text-neutral-500 text-xs">
                Luar biasa! Semua barang berputar dengan lancar di toko Anda.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
          <PieIcon className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="font-bold text-white text-base">Kontribusi Omset Berdasarkan Kategori</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Kategori yang paling banyak mendatangkan uang kas ke toko
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {categoryList.map(([catName, stats]) => {
            const percent = Math.round((stats.revenue / totalCategoryRevenue) * 100);
            return (
              <div key={catName} className="p-3.5 bg-neutral-850 rounded-xl border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-200">{catName}</span>
                  <span className="font-mono font-bold text-cyan-400">{percent}%</span>
                </div>

                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${percent}%` }}
                    className="h-full bg-cyan-400 rounded-full"
                  />
                </div>

                <div className="flex justify-between text-[11px] text-neutral-400 font-mono">
                  <span>Omset: Rp {stats.revenue.toLocaleString('id-ID')}</span>
                  <span className="text-emerald-400">+Rp {stats.profit.toLocaleString('id-ID')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
