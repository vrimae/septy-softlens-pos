"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Check, X, ChevronDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ApprovalItem = {
  id: string;
  category: "price" | "expense" | "cash_diff" | "warehouse";
  title: string;
  requester: string;
  details: string;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([
    {
      id: "APP-01",
      category: "price",
      title: "Diskon Khusus Softlens Toric",
      requester: "SP Kasir (Pusat)",
      details: "Harga normal Rp 120.000 diajukan Rp 95.000 untuk pelanggan VIP langganan.",
      date: "Hari ini, 10:15",
      status: "PENDING",
    },
    {
      id: "APP-02",
      category: "expense",
      title: "Pengeluaran Beli Galon & Kopi",
      requester: "Admin Toko",
      details: "Nominal Rp 45.000 dari laci kasir.",
      date: "Hari ini, 09:30",
      status: "PENDING",
    },
  ]);

  const [expandedCat, setExpandedCat] = useState<string | null>("price");

  const handleAction = (id: string, action: "APPROVED" | "REJECTED") => {
    setItems(items.map(it => it.id === id ? { ...it, status: action } : it));
  };

  const getPendingCount = (cat: string) => items.filter(it => it.category === cat && it.status === "PENDING").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">Pusat Approval Owner</h1>
        <p className="text-gray-500 text-sm">Persetujuan untuk tindakan administratif yang membutuhkan wewenang Owner.</p>
      </div>

      <div className="space-y-4">
        {/* Card A: Harga di bawah Target Margin */}
        <Card className="rounded-3xl border border-gray-200 shadow-sm overflow-hidden p-6 transition-colors">
          <div 
            onClick={() => setExpandedCat(expandedCat === "price" ? null : "price")}
            className="flex justify-between items-center cursor-pointer select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center font-black text-sm">A</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Harga di bawah Target Margin</h2>
                <p className="text-xs text-gray-400">Pengajuan potongan harga oleh kasir</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${getPendingCount("price") > 0 ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                {getPendingCount("price")} Menunggu
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expandedCat === "price" ? "rotate-180" : ""}`} />
            </div>
          </div>

          {expandedCat === "price" && (
            <div className="mt-5 pt-4 border-t border-gray-100 space-y-3">
              {items.filter(it => it.category === "price").map(item => (
                <div key={item.id} className="p-4 bg-gray-50 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm">{item.title}</span>
                      <span className="text-[11px] text-gray-400 font-mono">({item.id})</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{item.details}</p>
                    <p className="text-[11px] text-gray-400 mt-1">Diajukan oleh: <strong className="text-gray-700">{item.requester}</strong> • {item.date}</p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {item.status === "PENDING" ? (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => handleAction(item.id, "APPROVED")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-8 px-3"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Setujui
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAction(item.id, "REJECTED")}
                          className="border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl text-xs h-8 px-3"
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Tolak
                        </Button>
                      </>
                    ) : (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${item.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {item.status === "APPROVED" ? "Disetujui" : "Ditolak"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Card ! : Notifikasi Pengeluaran Kasir */}
        <Card className="rounded-3xl border border-gray-200 shadow-sm overflow-hidden p-6 transition-colors">
          <div 
            onClick={() => setExpandedCat(expandedCat === "expense" ? null : "expense")}
            className="flex justify-between items-center cursor-pointer select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-sm">!</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Notifikasi Pengeluaran Kasir</h2>
                <p className="text-xs text-gray-400">Persetujuan biaya operasional mendadak</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${getPendingCount("expense") > 0 ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-500"}`}>
                {getPendingCount("expense")} Menunggu
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expandedCat === "expense" ? "rotate-180" : ""}`} />
            </div>
          </div>

          {expandedCat === "expense" && (
            <div className="mt-5 pt-4 border-t border-gray-100 space-y-3">
              {items.filter(it => it.category === "expense").map(item => (
                <div key={item.id} className="p-4 bg-gray-50 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="font-bold text-gray-900 text-sm">{item.title}</span>
                    <p className="text-xs text-gray-600 mt-1">{item.details}</p>
                    <p className="text-[11px] text-gray-400 mt-1">Diajukan: {item.requester} • {item.date}</p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {item.status === "PENDING" ? (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => handleAction(item.id, "APPROVED")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-8 px-3"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Setujui
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAction(item.id, "REJECTED")}
                          className="border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl text-xs h-8 px-3"
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Tolak
                        </Button>
                      </>
                    ) : (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${item.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {item.status === "APPROVED" ? "Disetujui" : "Ditolak"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Card B: Selisih Kas (Tutup Shift) */}
        <Card className="rounded-3xl border border-gray-200 shadow-sm overflow-hidden p-6 transition-colors">
          <div className="flex justify-between items-center cursor-pointer select-none">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center font-black text-sm">B</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Selisih Kas (Tutup Shift)</h2>
                <p className="text-xs text-gray-400">Pemeriksaan selisih kas fisik vs sistem</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-500">
              0 Menunggu
            </span>
          </div>
        </Card>

        {/* Card C: Gudang Barang Bermasalah */}
        <Card className="rounded-3xl border border-gray-200 shadow-sm overflow-hidden p-6 transition-colors">
          <div className="flex justify-between items-center cursor-pointer select-none">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center font-black text-sm">C</div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Gudang (Barang Bermasalah)</h2>
                <p className="text-xs text-gray-400">Persetujuan pemusnahan atau klaim retur pabrik</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-500">
              0 Menunggu
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
