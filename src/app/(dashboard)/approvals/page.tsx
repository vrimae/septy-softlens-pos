"use client";

import { Card } from "@/components/ui/card";

export default function ApprovalsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">Pusat Approval Owner</h1>
        <p className="text-gray-500 text-sm">Persetujuan untuk tindakan administratif yang membutuhkan wewenang Owner.</p>
      </div>

      <div className="space-y-4">
        {/* Card A */}
        <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 hover:border-gray-300 transition-colors cursor-pointer">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold text-sm">A</div>
              <h2 className="text-lg font-bold text-gray-900">Harga di bawah Target Margin</h2>
            </div>
            <span className="text-sm font-bold text-red-500">0 Menunggu</span>
          </div>
          <p className="text-sm text-gray-400 italic">Tidak ada permohonan harga yang menunggu persetujuan.</p>
        </Card>

        {/* Card ! */}
        <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 hover:border-gray-300 transition-colors cursor-pointer">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center font-bold text-sm">!</div>
              <h2 className="text-lg font-bold text-gray-900">Notifikasi Pengeluaran Kasir</h2>
            </div>
            <span className="text-sm font-bold text-purple-500">0 Menunggu</span>
          </div>
          <p className="text-sm text-gray-400 italic">Tidak ada notifikasi pengeluaran kasir.</p>
        </Card>

        {/* Card B */}
        <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 hover:border-gray-300 transition-colors cursor-pointer">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center font-bold text-sm">B</div>
              <h2 className="text-lg font-bold text-gray-900">Selisih Kas (Tutup Shift)</h2>
            </div>
            <span className="text-sm font-bold text-orange-500">0 Menunggu</span>
          </div>
          <p className="text-sm text-gray-400 italic">Tidak ada laporan selisih kas yang menunggu pemeriksaan.</p>
        </Card>

        {/* Card C */}
        <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 hover:border-gray-300 transition-colors cursor-pointer">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center font-bold text-sm">C</div>
              <h2 className="text-lg font-bold text-gray-900">Gudang (Barang Bermasalah)</h2>
            </div>
            <span className="text-sm font-bold text-blue-500">0 Menunggu</span>
          </div>
          <p className="text-sm text-gray-400 italic">Tidak ada barang di gudang yang menunggu keputusan.</p>
        </Card>
      </div>
    </div>
  );
}
