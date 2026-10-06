"use client";

import { useState } from "react";
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

type Employee = {
  id: string;
  name: string;
  email: string;
  branch: string;
  role: string;
  access: string;
  status: "ACTIVE" | "INACTIVE";
};

export default function UsersPage() {
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: "1",
      name: "Owner",
      email: "vrimae23@gmail.com",
      branch: "Pusat",
      role: "OWNER",
      access: "all",
      status: "ACTIVE",
    },
    {
      id: "2",
      name: "Siti Rahmawati (SP Kasir)",
      email: "kasir1@septy.com",
      branch: "Cabang 1",
      role: "KASIR",
      access: "pos, pelanggan",
      status: "ACTIVE",
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [branch, setBranch] = useState("Pusat");
  const [role, setRole] = useState("KASIR");
  const [access, setAccess] = useState("pos");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === "ACTIVE").length;
  const inactiveEmployees = employees.filter((e) => e.status === "INACTIVE").length;

  const handleOpenAdd = () => {
    setEditingId(null);
    setName("");
    setEmail("");
    setBranch("Pusat");
    setRole("KASIR");
    setAccess("pos, pelanggan");
    setStatus("ACTIVE");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setName(emp.name);
    setEmail(emp.email);
    setBranch(emp.branch);
    setRole(emp.role);
    setAccess(emp.access);
    setStatus(emp.status);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus karyawan ini?")) {
      setEmployees(employees.filter((e) => e.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    if (editingId) {
      setEmployees(
        employees.map((e) =>
          e.id === editingId
            ? { ...e, name, email, branch, role, access, status }
            : e
        )
      );
    } else {
      const newEmp: Employee = {
        id: Date.now().toString(),
        name,
        email,
        branch,
        role,
        access,
        status,
      };
      setEmployees([...employees, newEmp]);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-normal">Manajemen Karyawan</h1>
          <p className="text-gray-500 mt-1">Atur wewenang karyawan sesuai kebijakan toko.</p>
        </div>
        <Button 
          onClick={handleOpenAdd}
          className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-5 font-semibold shadow-sm h-11 flex items-center gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" /> Tambah Karyawan Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-gray-600 mb-1">Total pegawai</p>
            <div className="text-4xl font-semibold text-gray-900">{totalEmployees}</div>
          </div>
          <div className="w-14 h-14 bg-[#f0f4ff] rounded-xl flex items-center justify-center text-slate-900">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-gray-600 mb-1">Aktif</p>
            <div className="text-4xl font-semibold text-gray-900">{activeEmployees}</div>
          </div>
          <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center text-green-500">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 flex justify-between items-center">
          <div>
            <p className="text-sm font-bold text-gray-600 mb-1">Tidak aktif</p>
            <div className="text-4xl font-semibold text-gray-900">{inactiveEmployees}</div>
          </div>
          <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
            <UserX className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-1">
        <Table>
          <TableHeader>
            <TableRow className="bg-white hover:bg-white border-b-0 border-t border-gray-100">
              <TableHead className="font-bold text-gray-700 py-4 px-6">Info User</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6">Cabang</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Jabatan (Role)</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-center">Hak Akses Sementara</TableHead>
              <TableHead className="font-bold text-gray-700 py-4 px-6 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp) => (
              <TableRow key={emp.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                <TableCell className="px-6 py-4">
                  <p className="font-bold text-gray-900 text-base">{emp.name}</p>
                  <p className="text-sm text-gray-400">{emp.email}</p>
                </TableCell>
                <TableCell className="px-6 py-4 font-bold text-gray-700">{emp.branch}</TableCell>
                <TableCell className="px-6 py-4 text-center">
                  <span className={`font-semibold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full ${
                    emp.role === "OWNER" 
                      ? "bg-purple-100 text-purple-600" 
                      : emp.role === "ADMIN" 
                      ? "bg-blue-100 text-slate-900" 
                      : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {emp.role}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-4 text-center">
                  <span className="bg-gray-100 text-gray-600 font-bold text-xs px-3 py-1 rounded-full">
                    {emp.access}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleOpenEdit(emp)}
                    className="text-slate-900 font-bold text-sm mr-4 hover:underline"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(emp.id)}
                    className="text-red-500 font-bold text-sm hover:underline"
                  >
                    Hapus
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal Tambah / Edit Karyawan */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Karyawan" : "Tambah Karyawan Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Rina Anggraini"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Alamat Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@toko.com"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Cabang Penempatan</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value="Pusat">Pusat</option>
                  <option value="Cabang 1">Cabang 1</option>
                  <option value="Cabang 2">Cabang 2</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Jabatan (Role)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  <option value="KASIR">KASIR</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="OWNER">OWNER</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Hak Akses Sementara</label>
              <input
                type="text"
                value={access}
                onChange={(e) => setAccess(e.target.value)}
                placeholder="Contoh: pos, riwayat, pelanggan"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Status Keaktifan</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Tidak Aktif</option>
              </select>
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold">
                {editingId ? "Perbarui Karyawan" : "Simpan Karyawan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
