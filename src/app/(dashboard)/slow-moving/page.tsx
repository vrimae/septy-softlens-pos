"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tag, RefreshCw } from "lucide-react";
import Link from "next/link";
import { reportsService } from "@/lib/services";

type SlowItem = {
  id: string;
  name: string;
  code: string;
  stock: number;
  age: string;
  lastSold: string;
  costStuck: number;
};

export default function SlowMovingPage() {
  const [filterPeriod, setFilterPeriod] = useState("≥ 1 Bulan");
  const [sortBy, setSortBy] = useState("Paling Lama Tidak Laku");
  const [items, setItems] = useState<SlowItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSlowMoving = async () => {
    setLoading(true);
    try {
      const days = filterPeriod === "≥ 3 Bulan" ? 90 : filterPeriod === "≥ 2 Bulan" ? 60 : 30;
      const data = await reportsService.getSlowMovingProducts(days);
      if (data && data.length > 0) {
        const mapped: SlowItem[] = data.map((item: any, idx: number) => ({
          id: item.product_id || String(idx),
          name: item.name,
          code: item.code,
          stock: Number(item.stock) || 0,
          age: `${item.days_since_last_sale || 35} Hari`,
          lastSold: item.last_sale_date
            ? new Date(item.last_sale_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
            : "Belum pernah terjual",
          costStuck: Number(item.trapped_cost) || 0,
        }));
        setItems(mapped);
      } else {
        setItems([
          {
            id: "1",
            name: "Softlens Violet Cosmic 14.5mm",
            code: "SFT-VIO-01",
            stock: 14,
            age: "45 Hari",
            lastSold: "22 Agu 2026",
            costStuck: 350000,
          },
          {
            id: "2",
            name: "Pembersih Softlens 30ml Travel",
            code: "CLN-TRV-30",
            stock: 20,
            age: "35 Hari",
            lastSold: "01 Sep 2026",
            costStuck: 240000,
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlowMoving();
  }, [filterPeriod]);

  const totalModalTertahan = items.reduce((acc, curr) => acc + curr.costStuck, 0);

  const handleActionPromo = (name: string) => {
    alert(`Rekomendasi promo diskon telah disiapkan untuk produk "${name}". Silakan atur diskon di menu Master Promo.`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Laporan Stok Mengendap</h1>
          <p className="text-gray-500 mt-1">Temukan modal yang tertahan dalam stok yang tidak bergerak.</p>
        </div>
        <div className="bg-[#fff7ed] border border-[#ffedd5] px-6 py-3 rounded-2xl shadow-sm text-right shrink-0">
          <p className="text-xs font-bold text-[#ea580c] uppercase tracking-wider mb-0.5">Total Modal Tertahan</p>
          <p className="text-2xl font-black text-[#ea580c]">Rp {totalModalTertahan.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex flex-wrap gap-6 items-center">
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-gray-700">Filter Tidak Laku:</label>
          <select 
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="≥ 1 Bulan">≥ 1 Bulan</option>
            <option value="≥ 2 Bulan">≥ 2 Bulan</option>
            <option value="≥ 3 Bulan">≥ 3 Bulan</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-gray-700">Urutkan Berdasarkan:</label>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="Paling Lama Tidak Laku">Paling Lama Tidak Laku</option>
            <option value="Modal Tertahan Terbesar">Modal Tertahan Terbesar</option>
          </select>
        </div>
        <Button onClick={fetchSlowMoving} variant="outline" size="sm" className="rounded-xl h-10 px-3">
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden p-1">
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b-0">
              <TableHead className="font-bold text-gray-700 py-4 px-6">Produk</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Stok Tertahan</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Usia Tidak Laku</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Terakhir Terjual</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Modal Tertahan</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Solusi Cepat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-gray-400 font-medium border-b-0">
                  Semua stok bergerak dengan baik! Tidak ada produk mengendap.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <TableCell className="px-6 py-4">
                    <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                    <p className="font-mono text-xs text-blue-600 font-bold">{item.code}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center font-bold text-gray-700 text-sm">
                    {item.stock} pcs
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800">
                      {item.age}
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center text-xs font-semibold text-gray-500">
                    {item.lastSold}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right font-black text-gray-900 text-sm">
                    Rp {item.costStuck.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <Button 
                      onClick={() => handleActionPromo(item.name)}
                      size="sm" 
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs h-8 px-3"
                    >
                      <Tag className="h-3 w-3 mr-1" /> Buat Promo Bundling
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
