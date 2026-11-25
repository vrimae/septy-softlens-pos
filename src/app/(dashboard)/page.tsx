"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Trash2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function DashboardPage() {
  const { role, activeProfile, activeBranch, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    omzet: 0,
    laba: 0,
    transaksi: 0,
    upselling: 0,
    chart: [] as any[],
    rankings: [] as any[]
  });

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteSalesMode, setDeleteSalesMode] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [resetSalesMode, setResetSalesMode] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  useEffect(() => {
    if (!loading && role && role !== 'owner') {
      router.push('/pos');
    }
  }, [role, loading, router]);

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_dashboard_stats', { p_branch_id: activeBranch?.id || null });
      if (!error && data) {
        setStats({
          omzet: Number(data.omzet) || 0,
          laba: Number(data.laba) || 0,
          transaksi: Number(data.transaksi) || 0,
          upselling: Number(data.upselling) || 0,
          chart: data.chart || [],
          rankings: data.rankings || []
        });
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeBranch]);

  useEffect(() => {
    if (!loading && role === 'owner') {
      fetchStats();
    }
  }, [loading, role, fetchStats]);

  const handleDeleteSP = async () => {
    if (role !== 'owner') {
      alert("Hanya akun Owner yang memiliki wewenang untuk menghapus peringkat!");
      return;
    }
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.rpc('remove_sp_from_ranking', {
        p_cashier_id: deleteTarget.cashier_id,
        p_branch_id: activeBranch?.id || null,
        p_delete_sales: deleteSalesMode,
      });

      if (error) throw error;

      await fetchStats();
      setDeleteTarget(null);
      setDeleteSalesMode(false);
    } catch (err: any) {
      console.error(err);
      alert(`Gagal menghapus SP: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetRankings = async () => {
    if (role !== 'owner') {
      alert("Hanya akun Owner yang memiliki wewenang untuk mereset peringkat!");
      return;
    }

    setIsResetting(true);
    try {
      const { data, error } = await supabase.rpc('reset_all_sp_rankings', {
        p_branch_id: activeBranch?.id || null,
        p_delete_sales: resetSalesMode,
      });

      if (error) throw error;

      await fetchStats();
      setIsResetModalOpen(false);
      setResetSalesMode(false);
    } catch (err: any) {
      console.error(err);
      alert(`Gagal mereset peringkat: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsResetting(false);
    }
  };
  
  if (role !== 'owner') return null;

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-normal">Halo, {activeProfile?.full_name || 'Owner'}!</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Ringkasan aktivitas dan performa sistem.</p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-full shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sistem POS Aktif & Tersinkronisasi</span>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-xl border-gray-200 dark:border-gray-800 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <span className="inline-block px-3 py-1 bg-blue-50 text-blue-500 font-medium text-xs rounded-lg">Omzet</span>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">TOTAL OMZET BULAN INI</p>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Rp {stats.omzet.toLocaleString('id-ID')}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl border-gray-200 dark:border-gray-800 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <span className="inline-block px-3 py-1 bg-green-50 text-green-500 font-medium text-xs rounded-lg">Laba</span>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">LABA KOTOR BULAN INI</p>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Rp {stats.laba.toLocaleString('id-ID')}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-xl border-gray-200 dark:border-gray-800 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <span className="inline-block px-3 py-1 bg-purple-50 text-purple-500 font-medium text-xs rounded-lg">Transaksi</span>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">TOTAL TRANSAKSI</p>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.transaksi} <span className="text-xl">Trx</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-gray-200 dark:border-gray-800 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <span className="inline-block px-3 py-1 bg-orange-50 text-orange-500 font-medium text-xs rounded-lg">Upselling</span>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">TOTAL UPSELLING</p>
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{stats.upselling} <span className="text-xl">Transaksi</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Chart Placeholder */}
      <div className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-6">Grafik Laba Kotor Harian (Bulan Ini)</h3>
        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={Array.from({ length: 31 }, (_, i) => {
                const dayStr = String(i + 1);
                const found = stats.chart.find((c: any) => String(c.date) === dayStr);
                return { date: dayStr, profit: found ? found.profit : 0 };
              })} 
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: '#6b7280' }} 
                axisLine={{ stroke: '#9ca3af' }} 
                tickLine={{ stroke: '#9ca3af' }}
                tickMargin={12}
                interval={1}
              />
              <YAxis 
                tickFormatter={(val) => val === 0 ? "0" : (val > 1000 ? (val/1000) + 'K' : val)}
                tick={{ fontSize: 11, fill: '#6b7280' }} 
                axisLine={{ stroke: '#9ca3af' }} 
                tickLine={{ stroke: '#9ca3af' }}
                width={40}
                domain={[0, 'auto']}
                allowDecimals={false}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-gray-200 p-3 shadow-md">
                        <p className="text-gray-800 text-sm mb-1">Tanggal {label}</p>
                        <p className="text-emerald-500 font-semibold text-sm">Laba : Rp {Number(payload[0].value).toLocaleString('id-ID')}</p>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ stroke: '#f3f4f6', strokeWidth: 32, fill: '#f3f4f6' }}
              />
              <Area type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SP Ranking Table */}
      <div className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-[#ff4f20] px-6 py-4 text-white font-bold text-lg flex items-center justify-between">
          <span>Papan Peringkat SP (Bulan Ini)</span>
          {role === 'owner' && stats.rankings.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setResetSalesMode(false);
                setIsResetModalOpen(true);
              }}
              className="text-xs font-semibold bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors border border-white/30 shadow-sm"
              title="Reset semua data peringkat bulan ini"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Peringkat</span>
            </button>
          )}
        </div>
        <Table>
          <TableHeader className="bg-white dark:bg-[#13151a]">
            <TableRow className="border-b-0 hover:bg-white dark:bg-[#13151a]">
              <TableHead className="font-bold text-gray-900 dark:text-gray-100 py-5">Peringkat</TableHead>
              <TableHead className="font-bold text-gray-900 dark:text-gray-100 py-5">Nama SP</TableHead>
              <TableHead className="font-bold text-gray-900 dark:text-gray-100 py-5">Total Transaksi</TableHead>
              <TableHead className="font-bold text-gray-900 dark:text-gray-100 py-5">Upselling</TableHead>
              <TableHead className="font-bold text-gray-900 dark:text-gray-100 py-5 text-right">Target Barang Tercapai</TableHead>
              {role === 'owner' && (
                <TableHead className="font-bold text-gray-900 dark:text-gray-100 py-5 text-center">Aksi</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.rankings.length > 0 ? (
              stats.rankings.map((sp, idx) => (
                <TableRow key={sp.cashier_id || idx} className="hover:bg-gray-50/80 dark:hover:bg-[#1a1f26]/50">
                  <TableCell className="font-bold text-gray-900 dark:text-gray-100">
                    {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                  </TableCell>
                  <TableCell className="font-medium">{sp.name}</TableCell>
                  <TableCell>{sp.total_transaksi} Trx</TableCell>
                  <TableCell className="text-green-600 font-bold">{sp.upselling} Trx</TableCell>
                  <TableCell className="text-right">{sp.target} Items</TableCell>
                  {role === 'owner' && (
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(sp);
                          setDeleteSalesMode(false);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors border border-red-200 dark:border-red-900/50 shadow-xs"
                        title={`Hapus ${sp.name} dari Papan Peringkat`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Hapus</span>
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={role === 'owner' ? 6 : 5} className="text-center py-10 text-gray-500 dark:text-gray-400">
                  Belum ada data peringkat untuk bulan ini.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Hapus SP dari Peringkat (Khusus Owner) */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" /> Hapus dari Papan Peringkat
            </DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Apakah Anda ingin menghapus <strong className="text-gray-900 dark:text-gray-100">{deleteTarget.name}</strong> ({deleteTarget.total_transaksi} Trx, {deleteTarget.upselling} Upselling) dari papan peringkat bulan ini?
              </p>

              <div className="space-y-2 border border-gray-200 dark:border-gray-800 rounded-xl p-3 bg-gray-50 dark:bg-[#1a1f26]">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Pilih Metode Penghapusan:</p>
                
                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="deleteSpMode"
                    checked={!deleteSalesMode}
                    onChange={() => setDeleteSalesMode(false)}
                    className="mt-0.5 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Hapus dari Peringkat Saja (Direkomendasikan)</span>
                    <p className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">
                      Melepaskan SP dari daftar peringkat bulan ini. Data omzet, laba kotor, dan riwayat laporan toko tetap aman dan utuh.
                    </p>
                  </div>
                </label>

                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="deleteSpMode"
                    checked={deleteSalesMode}
                    onChange={() => setDeleteSalesMode(true)}
                    className="mt-0.5 text-red-600 focus:ring-red-500"
                  />
                  <div>
                    <span className="font-semibold text-red-600">Hapus Permanen Beserta Transaksinya</span>
                    <p className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">
                      Menghapus seluruh transaksi penjualan kasir ini di bulan ini secara permanen dari sistem.
                    </p>
                  </div>
                </label>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
                <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                  Batal
                </Button>
                <Button 
                  onClick={handleDeleteSP} 
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold"
                >
                  {isDeleting ? "Menghapus..." : "Konfirmasi Hapus"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Reset Seluruh Papan Peringkat (Khusus Owner) */}
      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <RotateCcw className="h-5 w-5" /> Reset Seluruh Papan Peringkat
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Apakah Anda yakin ingin mengosongkan / mereset seluruh data Papan Peringkat SP untuk bulan ini?
            </p>

            <div className="space-y-2 border border-gray-200 dark:border-gray-800 rounded-xl p-3 bg-gray-50 dark:bg-[#1a1f26]">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="resetRankingsMode"
                  checked={!resetSalesMode}
                  onChange={() => setResetSalesMode(false)}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Reset Peringkat Saja (Aman &amp; Direkomendasikan)</span>
                  <p className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">
                    Mengosongkan daftar peringkat SP bulan ini. Seluruh omzet dan data transaksi toko tetap tersimpan rapi.
                  </p>
                </div>
              </label>

              <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="resetRankingsMode"
                  checked={resetSalesMode}
                  onChange={() => setResetSalesMode(true)}
                  className="mt-0.5 text-red-600 focus:ring-red-500"
                />
                <div>
                  <span className="font-semibold text-red-600">Hapus Semua Transaksi Kasir Bulan Ini</span>
                  <p className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">
                    Menghapus seluruh transaksi penjualan kasir di bulan ini secara permanen dari sistem.
                  </p>
                </div>
              </label>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
              <Button variant="outline" onClick={() => setIsResetModalOpen(false)} disabled={isResetting}>
                Batal
              </Button>
              <Button 
                onClick={handleResetRankings} 
                disabled={isResetting}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                {isResetting ? "Mereset..." : "Ya, Reset Peringkat"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
