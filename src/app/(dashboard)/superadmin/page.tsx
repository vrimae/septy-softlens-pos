"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { settingsService } from "@/lib/services";
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
  Users,
  Sparkles,
  Calendar,
  Clock,
  Zap,
  Edit2,
  Infinity as InfinityIcon,
  AlertTriangle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  email_confirmed_at: string | null;
  created_at: string;
};

type AccountConfig = {
  ai_daily_limit: number;
  expires_at: string;
  is_lifetime?: boolean;
  updated_at?: string;
};

const SUPER_ADMIN_EMAIL = "vrimae23@gmail.com";

export default function SuperAdminPage() {
  const { user, activeProfile, loading: authLoading } = useAuth();
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [subConfig, setSubConfig] = useState<{
    global: any;
    accounts: Record<string, AccountConfig>;
  }>({
    global: { default_ai_daily_limit: 50, default_expires_at: "2026-12-31" },
    accounts: {},
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // State Modal Edit Kuota AI & Masa Aktif
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editAiDailyLimit, setEditAiDailyLimit] = useState<number>(50);
  const [editExpiresAt, setEditExpiresAt] = useState<string>("2026-12-31");
  const [editIsLifetime, setEditIsLifetime] = useState<boolean>(false);
  const [editStatus, setEditStatus] = useState<string>("ACTIVE");
  const [isSaving, setIsSaving] = useState(false);

  // Akses proteksi super admin
  const activeEmail = (activeProfile?.email || (!activeProfile ? user?.email : "") || "").toLowerCase().trim();
  const isSuperAdmin = activeEmail.includes("vrimae");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [rpcRes, configRes] = await Promise.all([
        supabase.rpc("get_all_users_for_admin"),
        settingsService.getSubscriptionConfig().catch(() => ({
          global: { default_ai_daily_limit: 50, default_expires_at: "2026-12-31" },
          accounts: {},
        })),
      ]);

      if (configRes) {
        setSubConfig(configRes);
      }

      if (!rpcRes.error && rpcRes.data) {
        setUsersList(rpcRes.data as AdminUser[]);
      } else {
        // Fallback: Ambil data dari tabel profiles
        const { data: profilesData } = await supabase
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
      const { error } = await supabase.rpc("confirm_user_email", {
        target_email: targetEmail.trim(),
      });

      if (error) {
        // Fallback: Update manual status di tabel profiles
        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({ status: "ACTIVE", is_active: true })
          .ilike("email", targetEmail.trim());

        if (profileUpdateError) {
          throw new Error("Gagal konfirmasi: Pastikan fungsi SQL confirm_user_email sudah dipasang di Supabase.");
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
        text: err.message || "Gagal mengonfirmasi akun.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Buka Modal Edit Akun
  const handleOpenEditModal = (u: AdminUser) => {
    setSelectedUser(u);
    const cfg = subConfig.accounts[u.id] || subConfig.accounts[u.email.toLowerCase()] || {};
    
    // Set kuota AI (default 50)
    setEditAiDailyLimit(cfg.ai_daily_limit !== undefined ? cfg.ai_daily_limit : 50);
    setEditIsLifetime(!!cfg.is_lifetime);
    
    // Set masa aktif (default 1 tahun dari sekarang jika belum diset)
    if (cfg.expires_at) {
      setEditExpiresAt(cfg.expires_at.split("T")[0]);
    } else {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      setEditExpiresAt(d.toISOString().split("T")[0]);
    }

    setEditStatus(u.status || "ACTIVE");
    setEditModalOpen(true);
  };

  // Simpan Perubahan Modal
  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    setIsSaving(true);

    try {
      // 1. Simpan berdasarkan ID akun
      await settingsService.updateAccountSubscription(selectedUser.id, {
        ai_daily_limit: editAiDailyLimit,
        expires_at: editExpiresAt,
        is_lifetime: editIsLifetime,
        status: editStatus,
      });

      // 2. Simpan juga berdasarkan email untuk backup pencarian
      if (selectedUser.email && selectedUser.email !== selectedUser.id) {
        await settingsService.updateAccountSubscription(selectedUser.email.toLowerCase(), {
          ai_daily_limit: editAiDailyLimit,
          expires_at: editExpiresAt,
          is_lifetime: editIsLifetime,
          status: editStatus,
        });
      }

      setMessage({
        type: "success",
        text: `Berhasil! Pengaturan akun, kuota AI (${editAiDailyLimit >= 9999 ? 'Unlimited' : editAiDailyLimit + 'x/hari'}), dan masa aktif (${editIsLifetime ? 'Selamanya' : editExpiresAt}) untuk ${selectedUser.full_name} telah diperbarui.`,
      });
      setEditModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      console.error(err);
      alert("Gagal menyimpan konfigurasi: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setIsSaving(false);
    }
  };

  // Helper Tambah Hari / Bulan ke Tanggal
  const addDaysToExpiration = (days: number) => {
    const base = editExpiresAt ? new Date(editExpiresAt) : new Date();
    const current = isNaN(base.getTime()) ? new Date() : base;
    current.setDate(current.getDate() + days);
    setEditExpiresAt(current.toISOString().split("T")[0]);
    setEditIsLifetime(false);
  };

  // Helper Formatting Tampilan Masa Aktif
  const getExpirationInfo = (u: AdminUser) => {
    const cfg = subConfig.accounts[u.id] || subConfig.accounts[u.email.toLowerCase()];
    if (cfg?.is_lifetime) {
      return {
        label: "Aktif Selamanya",
        badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
        isLifetime: true,
      };
    }

    const expStr = cfg?.expires_at || subConfig.global.default_expires_at || "2026-12-31";
    const expDate = new Date(expStr);
    const now = new Date();
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return {
        label: `Kadaluarsa (${expDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })})`,
        badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
        isExpired: true,
      };
    } else if (diffDays <= 7) {
      return {
        label: `${diffDays} hari lagi (${expDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" })})`,
        badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        isUrgent: true,
      };
    } else {
      return {
        label: `s.d. ${expDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} (${diffDays} hr)`,
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
      };
    }
  };

  // Helper Formatting Tampilan Kuota AI
  const getAiQuotaInfo = (u: AdminUser) => {
    const cfg = subConfig.accounts[u.id] || subConfig.accounts[u.email.toLowerCase()];
    const limit = cfg?.ai_daily_limit !== undefined ? cfg.ai_daily_limit : subConfig.global.default_ai_daily_limit || 50;

    if (limit >= 9999 || cfg?.is_lifetime) {
      return {
        label: "Unlimited",
        badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
        isUnlimited: true,
      };
    }

    return {
      label: `${limit}x / hari`,
      badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
      limit,
    };
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
    SET status = 'ACTIVE', is_active = true
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
          <RefreshCw className="h-8 w-8 animate-spin text-slate-900 dark:text-slate-100 mx-auto" />
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Memeriksa hak akses Super Admin...</p>
        </div>
      </div>
    );
  }

  // Proteksi Akses: Hanya email vrimae yang diizinkan
  if (!isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white dark:bg-[#13151a] border border-red-200 dark:border-red-900/50 rounded-2xl p-8 text-center shadow-lg space-y-5">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/40 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-normal">
              Akses Dibatasi (Restricted Area)
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 max-w-md mx-auto leading-relaxed">
              Halaman ini adalah **Super Admin Panel** yang diproteksi secara khusus dan hanya dapat dikelola oleh pemilik sistem dengan email:
            </p>
            <div className="inline-block mt-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-1.5 rounded-full font-bold text-sm">
              {SUPER_ADMIN_EMAIL}
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all"
            >
              Kembali ke Dashboard Utama
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = usersList.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner Super Admin */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-semibold text-blue-200 tracking-wide uppercase">
            <ShieldCheck className="h-4 w-4 text-blue-400" /> Super Admin Control Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Pusat Kendali Lisensi, Kuota AI & Akun
          </h1>
          <p className="text-blue-100/80 text-sm leading-relaxed">
            Kelola batas panggilan AI harian, perpanjang masa aktif akun toko/pengguna, dan konfirmasi pendaftaran secara instan.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-blue-200">
            <span>Login Super Admin:</span>
            <span className="bg-white/10 dark:bg-[#13151a]/20 px-2.5 py-1 rounded-lg font-mono text-white font-bold border border-white/10">
              {activeProfile?.email || user?.email || SUPER_ADMIN_EMAIL}
            </span>
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-end pr-8 pointer-events-none">
          <KeyRound className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* Ringkasan Parameter Sistem */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#13151a] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Akun</p>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{usersList.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#13151a] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Default Kuota AI</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {subConfig.global.default_ai_daily_limit || 50}x <span className="text-xs font-normal text-gray-500">/ hari</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#13151a] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Masa Aktif Sistem</p>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-1">
              Aktif & Siap Dikelola
            </p>
          </div>
        </div>
      </div>

      {/* Alert Notifikasi */}
      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs underline font-bold ml-4">
            Tutup
          </button>
        </div>
      )}

      {/* Kartu Input Konfirmasi Email Cepat */}
      <div className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-[#2a303c] text-slate-900 dark:text-slate-100 flex items-center justify-center">
            <MailCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Konfirmasi & Verifikasi Akun Cepat
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ketikkan email pengguna yang baru daftar untuk mengaktifkan statusnya langsung tanpa link email.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirmUser(manualEmail);
          }}
          className="flex flex-col sm:flex-row gap-2.5 pt-1"
        >
          <input
            type="email"
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            placeholder="Ketik email akun (misal: user@gmail.com)..."
            className="flex-1 px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
            required
          />
          <Button
            type="submit"
            disabled={actionLoading}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-sm shrink-0"
          >
            {actionLoading ? "Memproses..." : "Konfirmasi Akun"}
          </Button>
        </form>
      </div>

      {/* Tabel Pengguna, Kuota AI, dan Masa Aktif */}
      <div className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-normal flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-700 dark:text-gray-300" /> Daftar Pengguna, Kuota AI & Lisensi Akun
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Klik <strong>"Edit Lisensi"</strong> pada baris pengguna untuk mengatur batas kuota AI harian atau memperpanjang masa aktif.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama / email..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <button
              onClick={fetchUsers}
              className="p-2 bg-gray-50 dark:bg-[#1e2329] hover:bg-gray-100 dark:hover:bg-[#2a303c] rounded-lg text-gray-600 dark:text-gray-400 transition-colors border border-gray-200 dark:border-gray-800"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="border border-gray-100 dark:border-gray-800 rounded-xl max-h-[70vh] overflow-x-scroll overflow-y-auto pb-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-[#1e2329] text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="py-3.5 px-5">Pengguna / Toko</th>
                <th className="py-3.5 px-4 text-center">Jabatan</th>
                <th className="py-3.5 px-4 text-center">Penggunaan AI / Hari</th>
                <th className="py-3.5 px-4 text-center">Masa Aktif Akun</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Aksi Super Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-slate-600" />
                    Memuat data akun...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Tidak ada pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isConfirmed = !!u.email_confirmed_at || u.status === "ACTIVE";
                  const expInfo = getExpirationInfo(u);
                  const aiInfo = getAiQuotaInfo(u);

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/80 dark:hover:bg-[#2a303c]/40 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-gray-900 dark:text-gray-100">{u.full_name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{u.email}</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          u.role === "OWNER" ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" :
                          u.role === "ADMIN" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" : "bg-gray-100 dark:bg-[#2a303c] text-gray-600 dark:text-gray-400"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${aiInfo.badge}`}>
                          <Zap className="h-3 w-3" />
                          {aiInfo.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${expInfo.badge}`}>
                          <Calendar className="h-3 w-3" />
                          {expInfo.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {u.status === "INACTIVE" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
                            <UserX className="h-3 w-3" /> Nonaktif
                          </span>
                        ) : isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800">
                            <UserCheck className="h-3 w-3" /> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEditModal(u)}
                            className="text-xs font-bold border-gray-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-[#2a303c] transition-colors"
                            title="Edit Kuota AI & Masa Aktif"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1 text-slate-700 dark:text-slate-300" /> Edit Lisensi
                          </Button>

                          {!isConfirmed && (
                            <Button
                              size="sm"
                              disabled={actionLoading}
                              onClick={() => handleConfirmUser(u.email)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm px-2.5"
                            >
                              <MailCheck className="h-3.5 w-3.5 mr-1" /> Aktivasi
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIT KUOTA AI & MASA AKTIF AKUN */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              Edit Kuota AI & Masa Aktif Akun
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-5 pt-3">
              {/* Profil Singkat Pengguna */}
              <div className="p-3.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{selectedUser.full_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{selectedUser.email}</p>
                </div>
                <span className="px-2.5 py-1 bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300">
                  {selectedUser.role}
                </span>
              </div>

              {/* 1. MASA AKTIF AKUN */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-blue-600" /> Masa Aktif Akun (Langganan)
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={editIsLifetime}
                      onChange={(e) => setEditIsLifetime(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span>Aktif Selamanya (Lifetime)</span>
                  </label>
                </div>

                {!editIsLifetime ? (
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={editExpiresAt}
                      onChange={(e) => setEditExpiresAt(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] text-gray-500 mr-1">Tambah Masa Aktif:</span>
                      <button
                        type="button"
                        onClick={() => addDaysToExpiration(30)}
                        className="px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
                      >
                        +30 Hari
                      </button>
                      <button
                        type="button"
                        onClick={() => addDaysToExpiration(90)}
                        className="px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
                      >
                        +3 Bulan
                      </button>
                      <button
                        type="button"
                        onClick={() => addDaysToExpiration(180)}
                        className="px-2.5 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
                      >
                        +6 Bulan
                      </button>
                      <button
                        type="button"
                        onClick={() => addDaysToExpiration(365)}
                        className="px-2.5 py-1 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-md transition-colors"
                      >
                        +1 Tahun
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 rounded-lg text-xs font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 shrink-0 text-purple-600" />
                    <span>Akun ini disetel memiliki masa aktif permanen (tanpa tanggal kadaluarsa).</span>
                  </div>
                )}
              </div>

              {/* 2. PENGGUNAAN AI PER HARI */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-500" /> Batas Penggunaan AI per Hari
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={editAiDailyLimit >= 9999 ? "" : editAiDailyLimit}
                    placeholder={editAiDailyLimit >= 9999 ? "Unlimited (Tanpa Batas)" : "Misal: 50"}
                    disabled={editAiDailyLimit >= 9999}
                    onChange={(e) => setEditAiDailyLimit(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:opacity-60"
                  />
                  <span className="text-xs font-bold text-gray-500">panggilan / hari</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-gray-500 mr-1">Preset:</span>
                  {[10, 25, 50, 100].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setEditAiDailyLimit(val)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                        editAiDailyLimit === val
                          ? "bg-slate-900 text-white"
                          : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {val}x
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditAiDailyLimit(999999)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors flex items-center gap-1 ${
                      editAiDailyLimit >= 9999
                        ? "bg-indigo-600 text-white"
                        : "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300"
                    }`}
                  >
                    <InfinityIcon className="h-3 w-3" /> Unlimited
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 leading-tight">
                  Membatasi frekuensi pemanggilan analisis Insight AI & Rekomendasi Restock Cerdas oleh kasir/owner per harinya.
                </p>
              </div>

              {/* 3. STATUS AKUN */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Status Operasional Akun
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="ACTIVE">ACTIVE (Akun Aktif & Terverifikasi)</option>
                  <option value="INACTIVE">INACTIVE (Nonaktif / Ditangguhkan)</option>
                  <option value="PENDING">PENDING (Menunggu Konfirmasi)</option>
                </select>
              </div>

              <DialogFooter className="pt-4 border-t mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditModalOpen(false)}
                  disabled={isSaving}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
                >
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Script SQL Helper untuk Super Admin */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Terminal className="h-5 w-5 text-blue-400" />
            <h3 className="font-bold text-sm text-white">
              Database RPC Helper (Opsional - Jalankan di Supabase SQL Editor)
            </h3>
          </div>
          <button
            onClick={copySqlScript}
            className="flex items-center gap-1.5 bg-white/10 dark:bg-[#13151a]/20 hover:bg-white/20 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
          >
            {copiedSql ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedSql ? "Disalin!" : "Salin SQL"}
          </button>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Semua konfigurasi kuota AI dan masa aktif akun tersimpan secara instan di database. Script SQL di atas dapat dijalankan di <strong>SQL Editor</strong> Supabase untuk melengkapi fungsi RPC aktivasi otomatis.
        </p>
      </div>
    </div>
  );
}
