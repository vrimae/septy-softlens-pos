"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  MailCheck, 
  RefreshCw, 
  Search, 
  Terminal, 
  Copy, 
  Check, 
  KeyRound, 
  Users 
} from "lucide-react";
import Link from "next/link";

type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  email_confirmed_at: string | null;
  created_at: string;
};

const SUPER_ADMIN_EMAIL = "vrimae23@gmail.com";

export default function SuperAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Coba panggil RPC get_all_users_for_admin jika sudah dipasang di Supabase
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_all_users_for_admin");

      if (!rpcError && rpcData) {
        setUsersList(rpcData as AdminUser[]);
      } else {
        // Fallback: Ambil data dari tabel profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (profilesData) {
          const mapped = profilesData.map((p) => ({
            id: p.id,
            email: p.email || p.id,
            full_name: p.full_name || "Pengguna",
            role: p.role || "OWNER",
            status: p.status || "ACTIVE",
            email_confirmed_at: p.status === "ACTIVE" ? p.created_at : null,
            created_at: p.created_at || new Date().toISOString(),
          }));
          setUsersList(mapped);
        }
      }
    } catch (err) {
      console.error("Gagal memuat pengguna:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  const handleConfirmUser = async (targetEmail: string) => {
    if (!targetEmail.trim()) return;
    setActionLoading(true);
    setMessage(null);

    try {
      // Panggil RPC confirm_user_email di Supabase
      const { data, error } = await supabase.rpc("confirm_user_email", {
        target_email: targetEmail.trim(),
      });

      if (error) {
        // Fallback: Update manual status di tabel profiles
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({ status: "ACTIVE" })
          .ilike("email", targetEmail.trim());

        if (profileUpdateError) {
          throw new Error("Gagal konfirmasi: Pastikan fungsi SQL confirm_user_email sudah dijalankan di Supabase SQL Editor.");
        }
      }

      setMessage({
        type: "success",
        text: `Berhasil! Akun ${targetEmail} telah dikonfirmasi dan diaktifkan.`,
      });
      setManualEmail("");
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      setMessage({
        type: "error",
        text: err.message || "Gagal mengonfirmasi akun. Silakan periksa koneksi atau jalankan Script SQL di bawah.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const copySqlScript = () => {
    const sql = `-- Salin dan Jalankan di Supabase SQL Editor:
CREATE OR REPLACE FUNCTION confirm_user_email(target_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE lower(email) = lower(target_email)
  RETURNING id INTO v_user_id;

  IF v_user_id IS NOT NULL THEN
    UPDATE profiles
    SET status = 'ACTIVE'
    WHERE id = v_user_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'Akun berhasil dikonfirmasi');
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Email tidak ditemukan di auth.users');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  created_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ,
  full_name VARCHAR,
  role VARCHAR,
  status VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::VARCHAR,
    u.created_at,
    u.email_confirmed_at,
    COALESCE(p.full_name, (u.raw_user_meta_data->>'full_name')::VARCHAR, 'Pengguna')::VARCHAR,
    COALESCE(p.role, (u.raw_user_meta_data->>'role')::VARCHAR, 'OWNER')::VARCHAR,
    COALESCE(p.status, CASE WHEN u.email_confirmed_at IS NOT NULL THEN 'ACTIVE' ELSE 'PENDING' END)::VARCHAR
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END;
$$;`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <RefreshCw className="h-8 w-8 animate-spin text-slate-900 mx-auto" />
          <p className="text-sm font-semibold text-gray-500">Memeriksa hak akses Super Admin...</p>
        </div>
      </div>
    );
  }

  // Proteksi Akses: Hanya email vrimae23@gmail.com yang diizinkan
  if (!isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white border border-red-200 rounded-xl p-8 text-center shadow-lg space-y-5">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-normal">
              Akses Dibatasi (Restricted Area)
            </h1>
            <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
              Halaman ini adalah **Super Admin Panel** yang diproteksi secara khusus dan hanya dapat dikelola oleh pemilik sistem dengan email:
            </p>
            <div className="inline-block mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-1.5 rounded-full font-bold text-sm">
              {SUPER_ADMIN_EMAIL}
            </div>
          </div>

          <div className="pt-2 text-xs text-gray-400">
            {user?.email ? (
              <span>Anda saat ini login sebagai: <strong className="text-gray-700">{user.email}</strong></span>
            ) : (
              <span>Anda belum login ke dalam sistem.</span>
            )}
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <Link href="/login">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl px-5">
                Login dengan {SUPER_ADMIN_EMAIL}
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="border-gray-200 rounded-xl px-5 font-semibold">
                Kembali ke Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = usersList.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner Super Admin */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-xl p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-slate-1000/20 border border-blue-400/30 text-blue-300 px-3.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
            <ShieldCheck className="h-4 w-4" /> Root Authority: Super Admin
          </div>
          <h1 className="text-2xl font-semibold tracking-normal">
            Super Admin Control Center
          </h1>
          <p className="text-blue-200/80 text-sm max-w-2xl leading-relaxed">
            Pusat kendali tertinggi sistem Septy Softlens POS. Anda dapat mengonfirmasi email pengguna baru, mengaktifkan akun toko, dan mengelola hak akses seluruh cabang.
          </p>
          <div className="pt-2 flex items-center gap-3 text-xs text-blue-300/80">
            <span>Akun Super Admin:</span>
            <span className="bg-white/10 px-2.5 py-1 rounded-lg font-mono text-white font-bold">
              {user.email}
            </span>
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-5 flex items-center justify-end pr-8 pointer-events-none">
          <KeyRound className="w-64 h-64" />
        </div>
      </div>

      {/* Alert Notifikasi */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-bold flex items-center justify-between shadow-sm ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-600"
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-gray-400 hover:text-gray-600 text-xs ml-4"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Quick Tool: Konfirmasi Email Manual */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center">
            <MailCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Konfirmasi & Verifikasi Email Instan
            </h2>
            <p className="text-xs text-gray-500">
              Ketikkan email yang ingin dikonfirmasi langsung tanpa perlu klik link email aktivasi.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirmUser(manualEmail);
          }}
          className="flex flex-col sm:flex-row gap-3 pt-2"
        >
          <input
            type="email"
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            placeholder="Ketik email akun baru (misal: user@gmail.com)..."
            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
            required
          />
          <Button
            type="submit"
            disabled={actionLoading}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl px-6 h-12 shadow-sm shrink-0"
          >
            {actionLoading ? "Memproses..." : "Konfirmasi Akun Sekarang"}
          </Button>
        </form>
      </div>

      {/* Tabel Pengguna & Status Konfirmasi */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 tracking-normal flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-700" /> Daftar Pengguna & Toko Terdaftar
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Kelola status verifikasi email dan akses pengguna.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama / email..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <button
              onClick={fetchUsers}
              className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors border border-gray-200"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-gray-500 text-[11px] font-bold uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-5">Pengguna / Toko</th>
                <th className="py-3.5 px-4 text-center">Jabatan</th>
                <th className="py-3.5 px-4 text-center">Status Email</th>
                <th className="py-3.5 px-4 text-center">Terdaftar</th>
                <th className="py-3.5 px-5 text-right">Tindakan Super Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-600" />
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    Tidak ada akun ditemukan.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isConfirmed = !!u.email_confirmed_at || u.status === "ACTIVE";
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-gray-900">{u.full_name}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">{u.email}</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          u.role === 'OWNER' ? 'bg-purple-100 text-purple-700' :
                          u.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                            <UserCheck className="h-3.5 w-3.5" /> Terverifikasi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <UserX className="h-3.5 w-3.5" /> Menunggu Konfirmasi
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center text-xs text-gray-500">
                        {new Date(u.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-4 px-5 text-right">
                        {!isConfirmed ? (
                          <Button
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleConfirmUser(u.email)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm h-8 px-3"
                          >
                            <MailCheck className="h-3.5 w-3.5 mr-1.5" /> Konfirmasi Email
                          </Button>
                        ) : (
                          <span className="text-xs font-bold text-gray-400">
                            Sudah Aktif
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Script SQL Helper untuk Super Admin */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Terminal className="h-5 w-5 text-blue-400" />
            <h3 className="font-bold text-sm text-white">
              Database RPC Helper (Jalankan Sekali di Supabase SQL Editor)
            </h3>
          </div>
          <button
            onClick={copySqlScript}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
          >
            {copiedSql ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedSql ? "Disalin!" : "Salin SQL"}
          </button>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Agar Super Admin memiliki wewenang langsung mengubah tabel otentikasi internal Supabase (<code className="text-blue-300">auth.users</code>), jalankan script ini di menu <strong>SQL Editor</strong> dashboard Supabase Anda.
        </p>
      </div>
    </div>
  );
}
