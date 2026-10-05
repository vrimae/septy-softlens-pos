"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function ConnectionStatusPage() {
  const [status, setStatus] = useState<"checking" | "connected" | "error">("checking");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    async function checkConnection() {
      try {
        const { error } = await supabase.from("store_settings").select("id").limit(1);
        if (error) {
          throw error;
        }
        setStatus("connected");
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.message || "Gagal terhubung ke Supabase");
      }
    }
    checkConnection();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Status Koneksi Supabase</h1>
        
        {status === "checking" && (
          <p className="text-blue-500 font-medium">Memeriksa koneksi...</p>
        )}
        
        {status === "connected" && (
          <div className="text-green-600">
            <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="font-medium text-lg">Berhasil Terhubung!</p>
            <p className="text-sm text-gray-500 mt-2">Klien Supabase dapat berkomunikasi dengan database.</p>
          </div>
        )}

        {status === "error" && (
          <div className="text-red-600">
            <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="font-medium text-lg">Gagal Terhubung</p>
            <p className="text-sm text-red-500 mt-2">{errorMsg}</p>
            <p className="text-sm text-gray-500 mt-4">Pastikan URL dan Anon Key Supabase di `.env` sudah benar dan RLS policy mengizinkan koneksi.</p>
          </div>
        )}
      </div>
    </div>
  );
}
