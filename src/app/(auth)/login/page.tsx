"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(""); // For registration
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
        // Register flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role: 'owner' } // Default as owner on sign up
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header Gradient */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-8 text-center text-white">
          <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg overflow-hidden p-2">
            {/* Logo placeholder - using text to mimic the logo in screenshot */}
            <span className="text-pink-500 font-bold text-2xl" style={{ fontFamily: 'cursive' }}>Septy</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">Septy Softlens</h1>
          <p className="text-blue-100 text-sm">Otentikasi Mesin Kasir (Device Login)</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button 
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${
              activeTab === "login" 
                ? "text-blue-600 border-b-2 border-blue-600" 
                : "text-gray-400 hover:text-gray-600"
            }`}
            onClick={() => { setActiveTab("login"); setError(null); setSuccess(null); }}
          >
            Login Owner
          </button>
          <button 
            className={`flex-1 py-4 text-sm font-semibold transition-colors ${
              activeTab === "register" 
                ? "text-blue-600 border-b-2 border-blue-600" 
                : "text-gray-400 hover:text-gray-600"
            }`}
            onClick={() => { setActiveTab("register"); setError(null); setSuccess(null); }}
          >
            Daftar Toko
          </button>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <form onSubmit={handleAuth} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm text-center">
                {success}
              </div>
            )}

            {activeTab === "register" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Nama Toko / Pemilik</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-blue-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Email Owner</label>
              <input 
                type="email" 
                className="w-full px-4 py-3 bg-blue-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 bg-blue-50/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg transition-colors mt-2"
              disabled={loading}
            >
              {loading 
                ? "Memproses..." 
                : (activeTab === "login" ? "Buka Kunci Mesin" : "Daftarkan Toko")
              }
            </button>
            
            <p className="text-center text-xs text-gray-400 mt-6 px-4">
              Login ini hanya dilakukan 1x untuk menghubungkan perangkat dengan toko Anda.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
