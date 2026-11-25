"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, Moon, Sun, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { isValidQris, cleanQris } from "@/lib/qris";
import { mutate as globalMutate } from "swr";

const DEFAULT_QRIS_PLACEHOLDER = "00020101021126670016COM.NOBUBANK.WWW011893600...";

export default function StoreProfilePage() {
  const { role, loading: authLoading } = useAuth();
  const isOwner = role === "owner";

  const [rowId, setRowId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [footer, setFooter] = useState("");
  const [qris, setQris] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwner) return;
    (async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("id, store_name, address, phone, receipt_footer, qris_raw_data")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) setError("Gagal memuat profil toko: " + error.message);
      if (data) {
        setRowId(data.id);
        setStoreName(data.store_name || "");
        setAddress(data.address || "");
        setPhone(data.phone || "");
        setFooter(data.receipt_footer || "");
        // Nilai bawaan database bukan QRIS asli, jangan ditampilkan sebagai data tersimpan
        setQris(data.qris_raw_data && data.qris_raw_data !== DEFAULT_QRIS_PLACEHOLDER ? data.qris_raw_data : "");
      }
      setLoading(false);
    })();
  }, [isOwner]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const q = cleanQris(qris);
    if (q && !isValidQris(q)) {
      setError("Kode QRIS tidak valid. Pastikan teks QRIS lengkap (diawali 000201, tanpa tanda '...') dan tidak terpotong.");
      return;
    }
    setSaving(true);
    const payload = {
      store_name: storeName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      receipt_footer: footer.trim(),
      qris_raw_data: q,
    };
    const res = rowId
      ? await supabase.from("store_settings").update(payload).eq("id", rowId).select("id").single()
      : await supabase.from("store_settings").insert([payload]).select("id").single();
    setSaving(false);

    if (res.error) {
      setError("Gagal menyimpan: " + res.error.message);
      return;
    }
    if (res.data?.id) setRowId(res.data.id);
    setQris(q);
    // Segarkan data profil toko di halaman kasir
    globalMutate("store_info_pos");
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  if (authLoading || (isOwner && loading)) {
    return <div className="text-sm text-gray-400 py-16 text-center">Memuat profil toko...</div>;
  }

  if (!isOwner) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Akses Ditolak</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Profil Toko hanya dapat dibuka dan diubah oleh Owner.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 pb-12">
      {savedMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" />
          Perubahan profil toko berhasil disimpan!
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-3.5 rounded-xl text-sm font-semibold shadow-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-8 space-y-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nama Toko</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1c5ffb] font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Alamat Lengkap</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1c5ffb] resize-none font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nomor WhatsApp / Telp</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1c5ffb] font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Pesan Penutup Struk (Footer)</label>
            <input
              type="text"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1c5ffb] font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Teks Kode QRIS (Raw String)</label>
            <textarea
              value={qris}
              onChange={(e) => setQris(e.target.value)}
              rows={3}
              placeholder="00020101021126...."
              className="w-full px-4 py-3 bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1c5ffb] text-gray-700 dark:text-gray-300 font-mono text-xs resize-none"
            />
            {qris.trim() && (
              <p className={`text-xs mt-2 font-semibold ${isValidQris(cleanQris(qris)) ? "text-emerald-600" : "text-red-500"}`}>
                {isValidQris(cleanQris(qris)) ? "✓ Kode QRIS valid (Siap digunakan di kasir)" : "✗ Kode QRIS belum valid (terpotong atau salah salin)"}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2 font-medium">Masukkan teks/kode RAW QRIS toko Anda. Sistem akan membuatkan gambar QR secara otomatis di kasir.</p>
          </div>
        </div>

        <div className="mt-10 mb-6 pt-4 border-t border-gray-100 dark:border-gray-800/50">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Pengaturan Tampilan</h2>
          <div
            onClick={() => setDarkMode(!darkMode)}
            className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex justify-between items-center bg-[#fafafa] cursor-pointer hover:bg-gray-100 dark:hover:bg-[#2a303c] dark:bg-[#2a303c]/60 transition-colors"
          >
            <div>
              <h3 className="font-bold text-gray-700 dark:text-gray-300">Tema Gelap (Dark Mode)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ganti tampilan aplikasi ke mode gelap.</p>
            </div>
            <div className={`w-10 h-10 rounded-full border border-gray-200 dark:border-gray-800 flex items-center justify-center transition-colors ${darkMode ? "bg-slate-800 text-yellow-300" : "bg-white dark:bg-[#13151a] text-gray-400"}`}>
              {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-sm flex items-center gap-2 mt-8"
        >
          <Check className="h-4 w-4" />
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </form>
    </div>
  );
}
