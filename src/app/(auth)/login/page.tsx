"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(""); 
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
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.session) {
          router.push("/");
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role: 'owner' }
          }
        });
        
        if (error) throw error;
        setSuccess("Pendaftaran berhasil! Silakan cek email Anda atau coba login sekarang.");
        setActiveTab("login");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat otentikasi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfdfd] p-4 font-sans">
      <div className="w-full max-w-[420px] bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-gray-100">
        
        {/* Header Gradient */}
        <div className="bg-gradient-to-br from-[#1c5ffb] to-[#4c39f1] pt-10 pb-8 text-center text-white">
          <div className="w-[72px] h-[72px] bg-white rounded-full mx-auto flex items-center justify-center mb-4 shadow-sm overflow-hidden">
            <span className="text-[#f76d8b] font-bold text-2xl italic tracking-tighter" style={{ fontFamily: 'cursive' }}>Septy</span>
          </div>
          <h1 className="text-2xl font-extrabold mb-1 tracking-tight">Septy Softlens</h1>
          <p className="text-blue-100/90 text-xs font-medium tracking-wide">Otentikasi Mesin Kasir (Device Login)</p>
        </div>

        {/* Tabs */}
        <div className="flex px-8 pt-6">
          <button 
            type="button"
            className={`flex-1 pb-3 text-sm font-bold transition-colors border-b-2 ${
              activeTab === "login" 
                ? "text-[#1f5ffe] border-[#1f5ffe]" 
                : "text-gray-400 border-transparent hover:text-gray-600"
            }`}
            onClick={() => { setActiveTab("login"); setError(null); setSuccess(null); }}
          >
            Login Owner
          </button>
          <button 
            type="button"
            className={`flex-1 pb-3 text-sm font-bold transition-colors border-b-2 ${
              activeTab === "register" 
                ? "text-[#1f5ffe] border-[#1f5ffe]" 
                : "text-gray-400 border-transparent hover:text-gray-600"
            }`}
            onClick={() => { setActiveTab("register"); setError(null); setSuccess(null); }}
          >
            Daftar Toko
          </button>
        </div>

        {/* Form Body */}
        <div className="px-8 pb-8 pt-6">
          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm text-center font-medium">
                {success}
              </div>
            )}

            {activeTab === "register" && (
              <div className="space-y-1.5">
                <label className="block text-[13px] font-bold text-gray-700">Nama Pemilik Toko</label>
                <input 
                  type="text" 
                  placeholder="Septy"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1f5ffe] focus:ring-1 focus:ring-[#1f5ffe] transition-all"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[13px] font-bold text-gray-700">Email Owner</label>
              <input 
                type="email" 
                placeholder="123456"
                className="w-full px-3.5 py-2.5 bg-[#f0f4ff] border border-transparent rounded-lg text-sm focus:outline-none focus:border-[#1f5ffe] focus:ring-1 focus:ring-[#1f5ffe] transition-all"
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
                className="w-full px-3.5 py-2.5 bg-[#f0f4ff] border border-transparent rounded-lg text-sm focus:outline-none focus:border-[#1f5ffe] focus:ring-1 focus:ring-[#1f5ffe] transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-[#1c5ffb] hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg transition-colors mt-2 text-sm shadow-sm"
              disabled={loading}
            >
              {loading 
                ? "Memproses..." 
                : (activeTab === "login" ? "Buka Kunci Mesin" : "Daftarkan Toko")
              }
            </button>
            
            <p className="text-center text-[11px] text-gray-400 mt-6 px-2 font-medium">
              {activeTab === "login" 
                ? "Login ini hanya dilakukan 1x untuk menghubungkan perangkat dengan toko Anda." 
                : "Akun yang didaftarkan akan otomatis menjadi Owner Utama."}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
