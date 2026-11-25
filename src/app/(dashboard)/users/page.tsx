"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserCheck, UserX, Plus, Edit2, Trash2, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { usersService } from "@/lib/services";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
};

export default function UsersPage() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("KASIR");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await usersService.getAllUsers();
      setEmployees(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.is_active).length;
  const inactiveEmployees = employees.filter((e) => !e.is_active).length;

  const handleOpenAdd = () => {
    setEditingId(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("KASIR");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Profile) => {
    setEditingId(emp.id);
    setName(emp.full_name || "");
    setEmail(emp.email || "");
    setPassword("");
    setRole(emp.role || "KASIR");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus user ini?")) {
      try {
        const res = await usersService.deleteUser(id);
        if (res?.message) {
          alert(res.message);
        }
        fetchUsers();
      } catch (e: any) {
        alert("Gagal memproses penghapusan user: " + (e.message || "Terjadi kesalahan sistem"));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        // Implement update if needed, for now just update role
        await usersService.updateUserRole(editingId, role as 'owner'|'admin'|'kasir'|'warehouse');
        if (password) {
          await usersService.updateUserPassword(editingId, password);
        }
      } else {
        await usersService.createUser({
          full_name: name,
          email: email,
          role: role,
          password: password || undefined
        });
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (e: any) {
      if (e.message?.includes("duplicate key") || e.message?.includes("users_email_partial_key") || e.message?.includes("already registered")) {
        alert("Gagal: Email ini sudah terdaftar di sistem. Silakan gunakan alamat email lain.");
      } else {
        alert("Gagal menyimpan: " + e.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (emp: Profile) => {
      try {
          await usersService.toggleUserActive(emp.id, !emp.is_active);
          fetchUsers();
      } catch (e: any) {
          alert(e.message);
      }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-200 tracking-normal">Manajemen Pengguna</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Kelola staf, kasir, dan hak akses aplikasi.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#13151a] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 dark:bg-[#1e2329] text-slate-900 dark:text-slate-100 rounded-lg flex items-center justify-center shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Total Karyawan</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalEmployees}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#13151a] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Aktif</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeEmployees}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#13151a] p-5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-lg flex items-center justify-center shrink-0">
            <UserX className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Nonaktif</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{inactiveEmployees}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800/50 flex justify-between items-center bg-gray-50 dark:bg-[#1e2329]/50">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">Daftar Pengguna</h2>
          <Button 
            onClick={handleOpenAdd}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" /> Tambah User
          </Button>
        </div>
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-[#1e2329]/50">
            <TableRow>
              <TableHead className="font-semibold text-gray-600 dark:text-gray-400">NAMA & EMAIL</TableHead>
              <TableHead className="font-semibold text-gray-600 dark:text-gray-400">ROLE</TableHead>
              <TableHead className="font-semibold text-gray-600 dark:text-gray-400">STATUS</TableHead>
              <TableHead className="font-semibold text-gray-600 dark:text-gray-400 text-right">AKSI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-gray-500 dark:text-gray-400">Belum ada user.</TableCell>
                </TableRow>
            ) : (
                employees.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-gray-50 dark:hover:bg-[#2a303c] dark:bg-[#1e2329] transition-colors">
                    <TableCell className="py-4">
                    <div>
                        <p className="font-bold text-gray-900 dark:text-gray-100">{emp.full_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{emp.email}</p>
                    </div>
                    </TableCell>
                    <TableCell>
                    <span className="px-2.5 py-1 bg-gray-100 dark:bg-[#2a303c] text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-800">
                        {emp.role}
                    </span>
                    </TableCell>
                    <TableCell>
                    <button
                        onClick={() => handleToggleStatus(emp)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg ${emp.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"}`}
                    >
                        {emp.is_active ? "AKTIF" : "NONAKTIF"}
                    </button>
                    </TableCell>
                    <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        <button 
                        onClick={() => handleOpenEdit(emp)}
                        className="p-2 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#2a303c] dark:bg-[#2a303c] rounded-lg transition-colors"
                        title="Edit Role"
                        >
                        <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                        onClick={() => handleDelete(emp.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus"
                        >
                        <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                    </TableCell>
                </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Role User" : "Tambah User Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!!editingId}
                placeholder="Contoh: Rina Anggraini"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Alamat Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!editingId}
                placeholder="email@toko.com"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:opacity-50"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingId ? "Kosongkan jika tidak ingin mengubah password" : "Buat password..."}
                  className="w-full px-3.5 py-2.5 pr-10 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                  required={!editingId}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                  tabIndex={-1}
                  title={showPassword ? "Sembunyikan password" : "Lihat password"}
                  aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Role / Jabatan</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="KASIR">Kasir / SP</option>
                <option value="ADMIN">Admin Gudang</option>
                <option value="OWNER">Owner</option>
              </select>
            </div>

            <DialogFooter className="pt-4 border-t mt-6">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Data"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
