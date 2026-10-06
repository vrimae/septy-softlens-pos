"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("vrimae23@gmail.com");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [storeName, setStoreName] = useState("Septy Softlens");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (activeTab === "login") {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        if (data.session) {
          router.push("/select-profile");
          router.refresh();
        }
      } else {
        if (password !== confirmPassword) {
          throw new Error("Konfirmasi password tidak cocok.");
        }
        if (password.length < 6) {
          throw new Error("Password minimal 6 karakter.");
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              store_name: storeName.trim(),
              role: "OWNER",
            },
          },
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
          // Buat record profil di tabel profiles dengan status PENDING menunggu Super Admin
          await supabase.from("profiles").upsert({
            id: signUpData.user.id,
            full_name: fullName.trim() || "Owner",
            role: "OWNER",
            status: "PENDING",
          });
        }

        setSuccess("Pendaftaran berhasil! Akun Anda sedang menunggu konfirmasi/verifikasi dari Super Admin (vrimae23@gmail.com). Anda dapat login setelah disetujui.");
        setActiveTab("login");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Terjadi kesalahan saat memproses otentikasi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f6fb] p-4 font-sans select-none">
      <div className="w-full max-w-[430px] bg-white rounded-[28px] shadow-[0_16px_40px_rgba(28,95,251,0.06),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden border border-gray-100">
        
        {/* Header Gradient */}
        <div className="bg-gradient-to-b from-[#1b62fc] to-[#3a3beb] pt-9 pb-8 text-center text-white relative">
          <div className="w-[74px] h-[74px] bg-white rounded-full mx-auto flex flex-col items-center justify-center mb-3.5 shadow-sm">
            <span className="text-[#f45b78] font-bold text-2xl tracking-normal leading-none italic font-serif">
              Septy
            </span>
            <span className="text-[#f45b78] text-[9px] font-semibold tracking-wider uppercase leading-tight mt-0.5 opacity-80">
              softlens
            </span>
          </div>
          <h1 className="text-[23px] font-semibold tracking-normal text-white">
            Septy Softlens
          </h1>
          <p className="text-slate-300/90 text-[12px] font-medium tracking-wide mt-0.5">
            Otentikasi Mesin Kasir (Device Login)
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-100 px-7 pt-4 bg-white">
          <button 
            type="button"
            className={`flex-1 pb-3 text-[14px] font-bold transition-all border-b-[3px] text-center ${
              activeTab === "login" 
                ? "text-[#1b62fc] border-[#1b62fc]" 
                : "text-[#8a9bb2] border-transparent hover:text-gray-700"
            }`}
            onClick={() => { setActiveTab("login"); setError(null); setSuccess(null); }}
          >
            Login Owner
          </button>
          <button 
            type="button"
            className={`flex-1 pb-3 text-[14px] font-bold transition-all border-b-[3px] text-center ${
              activeTab === "register" 
                ? "text-[#1b62fc] border-[#1b62fc]" 
                : "text-[#8a9bb2] border-transparent hover:text-gray-700"
            }`}
            onClick={() => { setActiveTab("register"); setError(null); setSuccess(null); }}
          >
            Daftar Toko
          </button>
        </div>

        {/* Form Container */}
        <div className="px-7 pt-5 pb-7 bg-white">
          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200/60 text-red-600 px-3.5 py-2.5 rounded-xl text-xs text-center font-semibold">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200/60 text-green-700 px-3.5 py-2.5 rounded-xl text-xs text-center font-semibold">
                {success}
              </div>
            )}

            {activeTab === "register" && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-bold text-gray-700">Nama Pemilik Toko</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Septy Wulandari"
                    className="w-full px-4 py-3 bg-[#eaf1fc] border border-transparent rounded-[12px] text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1b62fc]/30 focus:bg-white focus:border-[#1b62fc] transition-all"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[13px] font-bold text-gray-700">Nama Toko</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Septy Softlens Cabang 1"
                    className="w-full px-4 py-3 bg-[#eaf1fc] border border-transparent rounded-[12px] text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1b62fc]/30 focus:bg-white focus:border-[#1b62fc] transition-all"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="block text-[13px] font-bold text-gray-700">Email Owner</label>
              <input 
                type="email" 
                placeholder="nama@email.com"
                className="w-full px-4 py-3 bg-[#eaf1fc] border border-transparent rounded-[12px] text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1b62fc]/30 focus:bg-white focus:border-[#1b62fc] transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-[13px] font-bold text-gray-700">Password</label>
              <input 
                type="password" 
                placeholder="••••••"
                className="w-full px-4 py-3 bg-[#eaf1fc] border border-transparent rounded-[12px] text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1b62fc]/30 focus:bg-white focus:border-[#1b62fc] transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {activeTab === "register" && (
              <div className="space-y-1.5">
                <label className="block text-[13px] font-bold text-gray-700">Ulangi Password</label>
                <input 
                  type="password" 
                  placeholder="••••••"
                  className="w-full px-4 py-3 bg-[#eaf1fc] border border-transparent rounded-[12px] text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1b62fc]/30 focus:bg-white focus:border-[#1b62fc] transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <button 
              type="submit" 
              className="w-full bg-[#1b62fc] hover:bg-[#1552db] active:scale-[0.99] text-white font-bold py-3.5 rounded-[12px] transition-all duration-150 text-[14px] shadow-sm shadow-[#1b62fc]/20 mt-2"
              disabled={loading}
            >
              {loading 
                ? "Memproses..." 
                : (activeTab === "login" ? "Buka Kunci Mesin" : "Daftarkan Toko")
              }
            </button>
            
            <p className="text-center text-[11px] text-gray-400 mt-4 px-2 leading-relaxed font-medium">
              {activeTab === "login" 
                ? "Login ini hanya dilakukan 1x untuk menghubungkan perangkat dengan toko Anda." 
                : "Akun yang didaftarkan akan otomatis menjadi Owner Utama toko."}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
