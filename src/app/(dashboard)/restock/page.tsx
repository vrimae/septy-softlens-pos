"use client";

import { useState, useEffect } from "react";
import { reportsService } from "@/lib/services";

type RestockCard = {
  id: string;
  code: string;
  name: string;
  currentStock: number;
  minStock: number | null;
  sold30: number;
  velocity: number;
  suggestedQty: number;
  status: "Kritis" | "Waspada" | "Aman";
};

const STATUS_STYLE: Record<RestockCard["status"], { card: string; badge: string }> = {
  Kritis: { card: "border-red-200", badge: "bg-red-100 text-red-600" },
  Waspada: { card: "border-amber-200", badge: "bg-amber-100 text-amber-700" },
  Aman: { card: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700" },
};

function buildAnalysis(c: RestockCard): string[] {
  const lines = [
    `Penjualan rata-rata 30 hari = ${c.sold30} pcs.`,
    `Stok sekarang = ${c.currentStock} pcs.`,
  ];
  if (c.velocity <= 0) {
    lines.push(
      c.currentStock <= 0
        ? "Belum ada penjualan 30 hari terakhir dan stok kosong. Restock hanya jika produk ini memang masih dijual."
        : "Belum ada penjualan 30 hari terakhir, stok saat ini masih cukup."
    );
  } else {
    const daysLeft = c.currentStock / c.velocity;
    if (c.currentStock <= 0) {
      lines.push(`Stok habis, padahal kecepatan penjualan ${c.velocity} pcs/hari. Segera restock.`);
    } else if (daysLeft < 7) {
      lines.push(`Stok hanya cukup ± ${daysLeft.toFixed(1)} hari pada kecepatan penjualan ${c.velocity} pcs/hari. Segera restock.`);
    } else if (daysLeft < 14) {
      lines.push(`Stok cukup ± ${daysLeft.toFixed(1)} hari. Disarankan mulai merencanakan restock.`);
    } else {
      lines.push(`AI menyimpulkan stok saat ini masih cukup untuk memenuhi kecepatan penjualan (${c.velocity} pcs/hari).`);
    }
  }
  return lines;
}

import useSWR from "swr";

export default function AiRestockPage() {
  const [search, setSearch] = useState("");

  const fetchRestock = async () => {
    const data: any[] = await reportsService.getAiRestockRecommendations();
    return (data || []).map((item: any, idx: number) => {
      const currentStock = Number(item.current_stock) || 0;
      const sold30 = Number(item.sold_last_30_days) || 0;
      const velocity = Number((sold30 / 30).toFixed(1));
      const suggestedQty = Number(item.suggested_order_qty) || 0;
      const minStock = item.min_stock != null ? Number(item.min_stock) : null;
      const daysLeft = velocity > 0 ? currentStock / velocity : Infinity;

      let status: RestockCard["status"] = "Aman";
      if (currentStock <= 0 || daysLeft < 7 || String(item.priority || "").toUpperCase() === "KRITIS" || String(item.priority || "").toUpperCase() === "HABIS") {
        status = "Kritis";
      } else if (daysLeft < 14 || (minStock !== null && currentStock <= minStock)) {
        status = "Waspada";
      }

      return {
        id: item.variant_id || item.product_id || String(idx),
        code: item.product_code || "-",
        name: item.product_name || "Produk",
        currentStock,
        minStock,
        sold30,
        velocity,
        suggestedQty,
        status,
      } as RestockCard;
    });
  };

  const { data: cards = [], isValidating } = useSWR('restock_list', fetchRestock);
  const loading = !cards.length && isValidating;

  const filtered = cards.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">AI Restock &amp; Min. Stock</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Rekomendasi belanja berdasarkan kecepatan penjualan 30 hari terakhir.
        </p>
      </div>

      <div className="bg-white dark:bg-[#13151a] border border-gray-100 dark:border-gray-800 rounded-xl shadow-sm p-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari produk..."
          className="w-full px-4 py-2.5 bg-white dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Menganalisis data penjualan...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">Tidak ada produk yang perlu dianalisis saat ini.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((c) => {
            const style = STATUS_STYLE[c.status];
            return (
              <div
                key={c.id}
                className={`bg-white dark:bg-[#13151a] rounded-2xl border ${style.card} p-5 shadow-sm`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">{c.code}</p>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{c.name}</h3>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${style.badge}`}>{c.status}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-[#1e2329] rounded-lg p-3 mt-4">
                  <div>
                    <p className="text-[11px] text-gray-500">Stok Sekarang</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {c.currentStock} <span className="text-xs font-normal text-gray-500">pcs</span>
                    </p>
                    <p className="text-[10px] text-gray-400">Min: {c.minStock ?? "-"} pcs</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500">Terjual (30 Hari)</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {c.sold30} <span className="text-xs font-normal text-gray-500">pcs</span>
                    </p>
                    <p className="text-[10px] text-gray-400">~{c.velocity} / hari</p>
                  </div>
                </div>

                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-4">Analisis Transparan AI:</p>
                <div className="mt-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-xs text-slate-700 dark:text-slate-300 space-y-1 leading-relaxed">
                  {buildAnalysis(c).map((l, i) => (
                    <p key={i}>{l}</p>
                  ))}
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 mt-4 pt-3">
                  <p className="text-xs text-gray-500">Rekomendasi Belanja</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {c.suggestedQty} <span className="text-sm font-medium">pcs</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
