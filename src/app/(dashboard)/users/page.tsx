"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, UserCheck, UserX, Plus, Edit2, Trash2 } from "lucide-react";
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
    setRole("KASIR");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Profile) => {
    setEditingId(emp.id);
    setName(emp.full_name || "");
    setEmail(emp.email || "");
    setRole(emp.role || "KASIR");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus user ini?")) {
      try {
        await usersService.deleteUser(id);
        fetchUsers();
      } catch (e: any) {
        alert(e.message);
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
      } else {
        await usersService.createUser({
          full_name: name,
          email: email,
          role: role
        });
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (e: any) {
      alert(e.message);
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
        <h1 className="text-2xl font-semibold text-slate-800 tracking-normal">Manajemen Pengguna</h1>
        <p className="text-gray-500 mt-1">Kelola staf, kasir, dan hak akses aplikasi.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 text-slate-900 rounded-lg flex items-center justify-center shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Total Karyawan</p>
            <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Aktif</p>
            <p className="text-2xl font-bold text-gray-900">{activeEmployees}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-lg flex items-center justify-center shrink-0">
            <UserX className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Nonaktif</p>
            <p className="text-2xl font-bold text-gray-900">{inactiveEmployees}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="font-semibold text-gray-800">Daftar Pengguna</h2>
          <Button 
            onClick={handleOpenAdd}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg px-4 h-10 shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" /> Tambah User
          </Button>
        </div>
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="font-semibold text-gray-600">NAMA & EMAIL</TableHead>
              <TableHead className="font-semibold text-gray-600">ROLE</TableHead>
              <TableHead className="font-semibold text-gray-600">STATUS</TableHead>
              <TableHead className="font-semibold text-gray-600 text-right">AKSI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-gray-500">Belum ada user.</TableCell>
                </TableRow>
            ) : (
                employees.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="py-4">
                    <div>
                        <p className="font-bold text-gray-900">{emp.full_name}</p>
                        <p className="text-xs text-gray-500">{emp.email}</p>
                    </div>
                    </TableCell>
                    <TableCell>
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg border border-gray-200">
                        {emp.role}
                    </span>
                    </TableCell>
                    <TableCell>
                    <button
                        onClick={() => handleToggleStatus(emp)}
                        className={\px-2.5 py-1 text-xs font-bold rounded-lg \\}
                    >
                        {emp.is_active ? "AKTIF" : "NONAKTIF"}
                    </button>
                    </TableCell>
                    <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        <button 
                        onClick={() => handleOpenEdit(emp)}
                        className="p-2 text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
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
              <label className="block text-xs font-bold text-gray-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!!editingId}
                placeholder="Contoh: Rina Anggraini"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Alamat Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!editingId}
                placeholder="email@toko.com"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Role / Jabatan</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-900"
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
