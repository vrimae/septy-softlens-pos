"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Moon, Sun } from "lucide-react";

export default function StoreProfilePage() {
  const [storeName, setStoreName] = useState("Septy Softlens");
  const [address, setAddress] = useState("Jl. Contoh Alamat No 123");
  const [phone, setPhone] = useState("081234567890");
  const [footer, setFooter] = useState("Terima kasih atas kunjungan Anda");
  const [qris, setQris] = useState("00020101021126670016COM.NOBUBANK.WWW011893600...");
  const [darkMode, setDarkMode] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      {savedMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3.5 rounded-2xl text-sm font-bold shadow-sm flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" />
          Perubahan profil toko berhasil disimpan!
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-3xl shadow-sm p-8 space-y-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nama Toko</label>
            <input 
              type="text" 
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1c5ffb] font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Alamat Lengkap</label>
            <textarea 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1c5ffb] resize-none font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nomor WhatsApp / Telp</label>
            <input 
              type="text" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1c5ffb] font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Pesan Penutup Struk (Footer)</label>
            <input 
              type="text" 
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1c5ffb] font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Teks Kode QRIS (Raw String)</label>
            <input 
              type="text" 
              value={qris}
              onChange={(e) => setQris(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1c5ffb] text-gray-700 font-mono text-xs"
            />
            <p className="text-xs text-gray-400 mt-2 font-medium">Masukkan teks/kode RAW QRIS toko Anda. Sistem akan membuatkan gambar QR secara otomatis di kasir.</p>
          </div>
        </div>

        <div className="mt-10 mb-6 pt-4 border-t border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Pengaturan Tampilan</h2>
          <div 
            onClick={() => setDarkMode(!darkMode)}
            className="border border-gray-200 rounded-2xl p-4 flex justify-between items-center bg-[#fafafa] cursor-pointer hover:bg-gray-100/60 transition-colors"
          >
            <div>
              <h3 className="font-bold text-gray-700">Tema Gelap (Dark Mode)</h3>
              <p className="text-xs text-gray-500 mt-1">Ganti tampilan aplikasi ke mode gelap.</p>
            </div>
            <div className={`w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center transition-colors ${darkMode ? "bg-slate-800 text-yellow-300" : "bg-white text-gray-400"}`}>
              {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </div>
          </div>
        </div>

        <Button 
          type="submit"
          className="bg-[#1c5ffb] hover:bg-blue-700 text-white font-bold rounded-xl px-6 h-12 shadow-sm flex items-center gap-2 mt-8"
        >
          <Check className="h-4 w-4" />
          Simpan Perubahan
        </Button>
      </form>
    </div>
  );
}
