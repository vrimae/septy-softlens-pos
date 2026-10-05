"use client";

import { Button } from "@/components/ui/button";

export default function StoreProfilePage() {
  return (
    <div className="max-w-4xl space-y-8 pb-10">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nama Toko</label>
            <input 
              type="text" 
              defaultValue="Septy Softlens"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1c5ffb]"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Alamat Lengkap</label>
            <textarea 
              defaultValue="Jl. Contoh Alamat No 123"
              rows={3}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1c5ffb] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nomor WhatsApp / Telp</label>
            <input 
              type="text" 
              defaultValue="081234567890"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1c5ffb]"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Pesan Penutup Struk (Footer)</label>
            <input 
              type="text" 
              defaultValue="Terima kasih atas kunjungan Anda"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1c5ffb]"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Teks Kode QRIS (Raw String)</label>
            <input 
              type="text" 
              defaultValue="00020101021126670016COM.NOBUBANK.WWW011893600..."
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1c5ffb] text-gray-500"
            />
            <p className="text-xs text-gray-400 mt-2 font-medium">Masukkan teks/kode RAW QRIS toko Anda. Sistem akan membuatkan gambar QR secara otomatis di kasir.</p>
          </div>
        </div>

        <div className="mt-10 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Pengaturan Tampilan</h2>
          <div className="border border-gray-200 rounded-xl p-4 flex justify-between items-center bg-[#fafafa]">
            <div>
              <h3 className="font-bold text-gray-700">Tema Gelap (Dark Mode)</h3>
              <p className="text-xs text-gray-500 mt-1">Ganti tampilan aplikasi ke mode gelap.</p>
            </div>
            <div className="w-10 h-10 bg-white rounded-full border border-gray-200 flex items-center justify-center">
              {/* Sun icon placeholder */}
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            </div>
          </div>
        </div>

        <Button className="bg-[#1c5ffb] hover:bg-blue-700 text-white font-bold rounded-xl px-6 h-12 shadow-sm flex items-center gap-2 mt-8">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Simpan Perubahan
        </Button>
      </div>
    </div>
  );
}
