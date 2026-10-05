"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, ShoppingBag, Search, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { reportsService } from "@/lib/services";

type RestockRecommendation = {
  id: string;
  code: string;
  name: string;
  currentStock: number;
  velocity: number; // pcs per hari
  safeStockDays: number;
  suggestedQty: number;
  estCost: number;
};

export default function RestockPage() {
  const [search, setSearch] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<RestockRecommendation[]>([]);

  const fetchRecommendations = async () => {
    try {
      const data = await reportsService.getAiRestockRecommendations();
      if (data && data.length > 0) {
        const mapped: RestockRecommendation[] = data.map((item: any, idx: number) => ({
          id: item.variant_id || String(idx),
          code: item.product_code || `PRD-00${idx + 1}`,
          name: item.product_name || "Produk",
          currentStock: Number(item.current_stock) || 0,
          velocity: item.sold_last_30_days ? Number((item.sold_last_30_days / 30).toFixed(1)) : 1.5,
          safeStockDays: 14,
          suggestedQty: Number(item.suggested_order_qty) || 20,
          estCost: (Number(item.suggested_order_qty) || 20) * 35000,
        }));
        setRecommendations(mapped);
      } else {
        setRecommendations([
          {
            id: "1",
            code: "PRD-X2-SANSO",
            name: "X2 Sanso Color Silicone Hydrogel",
            currentStock: 3,
            velocity: 2.4,
            safeStockDays: 14,
            suggestedQty: 30,
            estCost: 1650000,
          },
          {
            id: "2",
            code: "PRD-X2-BLACK",
            name: "X2 Black Series Deep Black",
            currentStock: 2,
            velocity: 3.1,
            safeStockDays: 14,
            suggestedQty: 45,
            estCost: 1800000,
          },
          {
            id: "3",
            code: "PRD-RENU-355",
            name: "Bausch + Lomb Renu Fresh Solution 355ml",
            currentStock: 4,
            velocity: 1.8,
            safeStockDays: 14,
            suggestedQty: 25,
            estCost: 1125000,
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      await fetchRecommendations();
      alert("Analisis AI selesai! Produk dengan stok mendekati batas minimum telah diperbarui.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filtered = recommendations.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Sparkles className="h-7 w-7 text-blue-600" /> AI Restock & Min. Stock
          </h1>
          <p className="text-gray-500 mt-1">Rekomendasi belanja cerdas berdasarkan kecepatan penjualan (sales velocity) 30 hari terakhir.</p>
        </div>
        <Button 
          onClick={handleRunAnalysis}
          disabled={isAnalyzing}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl px-5 h-11 flex items-center gap-2 shadow-sm shrink-0"
        >
          <Sparkles className={`h-4 w-4 ${isAnalyzing ? "animate-spin" : ""}`} />
          {isAnalyzing ? "Menganalisis Data..." : "Jalankan Analisis AI Restock"}
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden p-1">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="relative max-w-md w-full">
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk rekomendasi..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
          </div>
          <div className="text-xs font-bold text-gray-500">
            Ditemukan {filtered.length} item rekomendasi
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b-0">
              <TableHead className="font-bold text-gray-700 py-4 px-6">Produk & Kode</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Sisa Stok</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Velocity (Hari)</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Rekomendasi Order</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Est. Modal</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-gray-400 font-medium border-b-0">
                  Tidak ada produk yang membutuhkan restock mendesak saat ini.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <TableCell className="px-6 py-4">
                    <p className="font-bold text-gray-900 text-sm">{r.name}</p>
                    <p className="font-mono text-xs text-blue-600 font-bold">{r.code}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-600">
                      {r.currentStock} pcs
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center text-xs font-bold text-gray-700">
                    {r.velocity} pcs / hari
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <span className="font-black text-blue-600 text-sm">+{r.suggestedQty} pcs</span>
                    <p className="text-[10px] text-gray-400">buffer 14 hari</p>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right font-bold text-gray-900 text-sm">
                    Rp {r.estCost.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <Link href="/purchases">
                      <Button size="sm" className="bg-[#00a84e] hover:bg-green-600 text-white font-bold rounded-xl text-xs h-8 px-3">
                        <ShoppingBag className="h-3 w-3 mr-1" /> Buat PO
                      </Button>
                    </Link>
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
