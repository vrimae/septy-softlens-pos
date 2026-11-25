"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabase/client";
import { unwrap, scopeBranch, withBranch, friendlyError, getActiveBranchId, getActiveProfileId } from "@/lib/supabase/db";

type ShiftClosing = {
  id: string;
  timestamp: string;
  systemCash: number;
  actualCash: number;
  difference: number;
  status: "PAS" | "LEBIH" | "KURANG";
  notes?: string;
};

export default function TutupKasPage() {
  const [systemCash, setSystemCash] = useState(0);
  const [actualCashInput, setActualCashInput] = useState("0");
  const [notes, setNotes] = useState("");
  const [closings, setClosings] = useState<ShiftClosing[]>([]);
  const [successMsg, setSuccessMsg] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchClosings = async () => {
    try {
      const rows = unwrap(await scopeBranch(
        supabase.from("shift_closings").select("*").order("shift_end", { ascending: false }).limit(10)
      ));
      const mapped: ShiftClosing[] = (rows || []).map((item: any) => ({
        id: item.id,
        timestamp: new Date(item.shift_end).toLocaleDateString("id-ID", {
          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
        }),
        systemCash: Number(item.system_cash) || 0,
        actualCash: Number(item.actual_cash) || 0,
        difference: Number(item.difference) || 0,
        status: item.status,
        notes: item.notes,
      }));
      setClosings(mapped);
    } catch (err) {
      alert(friendlyError(err));
    }
  };

  const getCashSales = async () => {
    try {
      const { data } = await supabase.rpc('get_current_system_cash', { p_cashier_id: getActiveProfileId() });
      if (data !== null) {
        setSystemCash(Number(data));
      }
    } catch (err) {
      console.warn("Could not calculate system cash:", err);
    }
  };

  useEffect(() => {
    getCashSales();
    fetchClosings();
  }, []);

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const actual = parseFloat(actualCashInput) || 0;
    const diffAmount = actual - systemCash;
    
    if (diffAmount !== 0 && !notes.trim()) {
      alert("Harap isi alasan / keterangan untuk selisih kas!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        branch_id: getActiveBranchId(),
        cashier_id: getActiveProfileId(),
        actual_cash: actual,
        notes: notes.trim() || "Tutup shift harian kasir"
      };
      const res = await supabase.rpc('close_cash_shift', { p_payload: payload });
      if (res.error) throw res.error;
      
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
      fetchClosings();
      getCashSales();
      setActualCashInput("0");
      setNotes("");
    } catch (err: any) {
      alert(friendlyError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-normal">Tutup Kas (Rekonsiliasi Shift)</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Lakukan rekonsiliasi uang fisik (Tunai) pada akhir shift Anda.</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-bold shadow-sm">
          Rekonsiliasi tutup kas shift berhasil disimpan dan dicatat!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Form */}
        <Card className="rounded-xl border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden border">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50 dark:bg-[#1e2329]/50">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Form Tutup Kas Shift</h2>
          </div>
          <CardContent className="px-6 py-6 space-y-6">
            <div className="bg-[#f0f4ff] dark:bg-blue-900/20 p-5 rounded-xl border border-transparent">
              <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Saldo Tunai Seharusnya (Sistem)</label>
              <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Rp {systemCash.toLocaleString()}</div>
            </div>
            
            <form onSubmit={handleCloseShift} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Total Uang Fisik (Tunai Aktual)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-sm font-bold text-gray-400">Rp</span>
                  <input 
                    type="number" 
                    value={actualCashInput}
                    onChange={(e) => setActualCashInput(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl text-base font-bold focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-[#1c5ffb]"
                    required
                  />
                </div>
              </div>

              {actualCashInput !== "" && (
                <div className="p-3 bg-gray-50 dark:bg-[#1e2329] rounded-xl flex justify-between text-xs font-bold text-gray-600 dark:text-gray-400">
                  <span>Selisih:</span>
                  <span className={parseFloat(actualCashInput) - systemCash === 0 ? "text-green-600" : "text-amber-600"}>
                    {parseFloat(actualCashInput) - systemCash >= 0 ? "+" : ""}
                    Rp {(parseFloat(actualCashInput) - systemCash).toLocaleString()}
                  </span>
                </div>
              )}

              {actualCashInput !== "" && (parseFloat(actualCashInput) - systemCash !== 0) && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Alasan / Keterangan Selisih</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Wajib diisi jika ada selisih kas..."
                    className="w-full px-4 py-3 bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-[#1c5ffb] resize-none h-24"
                    required
                  />
                </div>
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm">
                {isSubmitting ? "Menyimpan..." : "Kirim Tutup Kas"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Column: Riwayat */}
        <Card className="rounded-xl border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden border flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50 dark:bg-[#1e2329]/50">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Riwayat Tutup Kas</h2>
          </div>
          <CardContent className="p-0 flex-1">
            {closings.length === 0 ? (
              <div className="flex items-center justify-center p-12 text-gray-400 font-medium">
                Belum ada data rekonsiliasi shift.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-100 dark:border-gray-800/50 text-xs">
                    <TableHead className="py-3 px-4">Waktu</TableHead>
                    <TableHead className="py-3 px-4 text-right">Sistem</TableHead>
                    <TableHead className="py-3 px-4 text-right">Fisik</TableHead>
                    <TableHead className="py-3 px-4 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closings.map((c) => (
                    <TableRow key={c.id} className="border-b border-gray-50">
                      <TableCell className="py-3.5 px-4 font-semibold text-xs text-gray-700 dark:text-gray-300">
                        {c.timestamp}
                        {c.notes && c.notes !== "Tutup shift harian kasir" && (
                          <div className="text-[10px] text-gray-400 font-normal mt-1 leading-tight break-words max-w-[150px]">
                            Alasan: {c.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-right font-medium text-xs">Rp {c.systemCash.toLocaleString()}</TableCell>
                      <TableCell className="py-3.5 px-4 text-right font-bold text-xs">Rp {c.actualCash.toLocaleString()}</TableCell>
                      <TableCell className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === "PAS" ? "bg-green-100 text-green-700" : c.status === "LEBIH" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                        }`}>
                          {c.status}
                        </span>
                        {c.difference !== 0 && (
                          <div className={`text-[10px] font-bold mt-1 ${c.difference > 0 ? "text-blue-600" : "text-red-600"}`}>
                            {c.difference > 0 ? "+" : ""}Rp {c.difference.toLocaleString()}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
