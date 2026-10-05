"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, ShoppingBag, Search, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
  const [analyzed, setAnalyzed] = useState(true);

  const [recommendations, setRecommendations] = useState<RestockRecommendation[]>([
    {
      id: "1",
      code: "SFT-NAT-050",
      name: "Softlens Natural Brown Minus -0.50",
      currentStock: 3,
      velocity: 2.4,
      safeStockDays: 14,
      suggestedQty: 30,
      estCost: 750000,
    },
    {
      id: "2",
      code: "SFT-BLK-000",
      name: "Softlens Black Normal 14.2mm",
      currentStock: 2,
      velocity: 3.1,
      safeStockDays: 14,
      suggestedQty: 45,
      estCost: 1125000,
    },
    {
      id: "3",
      code: "CLN-100ML",
      name: "Cairan Pembersih All-in-One 100ml",
      currentStock: 4,
      velocity: 1.8,
      safeStockDays: 14,
      suggestedQty: 25,
      estCost: 375000,
    },
  ]);

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalyzed(true);
      alert("Analisis AI selesai! 3 produk memiliki stok kritis dan direkomendasikan untuk segera di-restock.");
    }, 1200);
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
          <span className="text-xs font-bold text-gray-500 hidden sm:inline">
            Buffer Hari Aman: 14 Hari Penjualan
          </span>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b-0 border-t border-gray-100">
              <TableHead className="font-bold text-gray-700 py-4 px-6">Produk</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Sisa Stok</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Kecepatan Jual</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Saran Restock</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Est. Modal Belanja</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Aksi Cepat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-gray-500 font-medium border-b-0">
                  Tidak ada produk yang cocok dengan pencarian.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <TableCell className="px-6 py-4">
                    <p className="font-mono text-xs font-bold text-blue-600">{item.code}</p>
                    <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <span className="bg-red-50 text-red-600 font-black text-xs px-2.5 py-1 rounded-full border border-red-200">
                      Tersisa {item.currentStock} pcs
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center font-bold text-gray-700 text-xs">
                    {item.velocity} pcs / hari
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center font-black text-emerald-700 text-sm">
                    +{item.suggestedQty} pcs
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right font-black text-gray-900 text-sm">
                    Rp {item.estCost.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-center">
                    <Link href="/purchases">
                      <Button 
                        size="sm"
                        className="bg-[#1c5ffb] hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-8 px-3.5 inline-flex items-center gap-1.5"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" /> Buat PO
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
