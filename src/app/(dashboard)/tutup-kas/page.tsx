"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TutupKasPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Tutup Kas (Rekonsiliasi Shift)</h1>
        <p className="text-gray-500 mt-1">Lakukan rekonsiliasi uang fisik (Tunai) pada akhir shift Anda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Form */}
        <Card className="rounded-2xl border-gray-200 shadow-sm overflow-hidden border">
          <div className="px-6 py-5">
            <h2 className="text-lg font-bold text-gray-900">Form Tutup Kas Shift</h2>
          </div>
          <CardContent className="px-6 pb-6 space-y-6">
            <div className="bg-[#f0f4ff] p-4 rounded-xl border border-transparent">
              <label className="block text-sm font-semibold text-[#1c5ffb] mb-1">Saldo Tunai Seharusnya (Sistem)</label>
              <div className="text-3xl font-black text-[#1c5ffb]">Rp 0</div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Total Uang Fisik (Tunai Aktual)</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-sm font-bold text-gray-400">Rp</span>
                <input 
                  type="text" 
                  defaultValue="0"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#1c5ffb] focus:ring-1 focus:ring-[#1c5ffb]"
                />
              </div>
            </div>

            <Button className="w-full bg-[#1c5ffb] hover:bg-blue-700 text-white font-bold rounded-xl h-12 text-sm shadow-sm">
              Kirim Tutup Kas
            </Button>
          </CardContent>
        </Card>

        {/* Right Column: Riwayat */}
        <Card className="rounded-2xl border-gray-200 shadow-sm overflow-hidden border flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Riwayat Tutup Kas</h2>
          </div>
          <CardContent className="p-0 flex-1 flex items-center justify-center min-h-[300px]">
            <p className="text-gray-400 font-medium">Belum ada data rekonsiliasi shift.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
