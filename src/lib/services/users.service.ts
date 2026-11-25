// ==============================================================================
// FILE: src/lib/services/users.service.ts
// DESCRIPTION: User Administration & Super Admin Email Confirmation Service Layer
// ==============================================================================

import { supabase } from '@/lib/supabase/client';
import { auditService } from './audit.service';
import { Profile } from './types';

export const usersService = {
  /**
   * Mengambil daftar semua pengguna terdaftar untuk Super Admin
   */
  async getAllUsers() {
    try {
      const { data, error } = await supabase.rpc('get_all_users_for_admin');
      if (error) {
        console.warn('Fallback users query:', error.message);
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (pErr) throw new Error(pErr.message);
        return profiles || [];
      }
      return data || [];
    } catch (err: any) {
      console.error('getAllUsers exception:', err);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      return profiles || [];
    }
  },

  /**
   * Konfirmasi email pengguna secara instan dari Super Admin via RPC confirm_user_email
   */
  async confirmUserEmail(email: string) {
    const { data, error } = await supabase.rpc('confirm_user_email', {
      target_email: email,
    });

    if (error) {
      console.error('Error confirming email:', error);
      throw new Error(error.message || 'Gagal mengonfirmasi email pengguna.');
    }

    return data as { success: boolean; message: string; email: string };
  },

  /**
   * Perbarui hak akses (role) pengguna
   */
  async updateUserRole(userId: string, role: 'owner' | 'admin' | 'kasir' | 'warehouse') {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    auditService.log("UPDATE_USER", { tableName: "profiles", recordId: data.id, after: data, reason: "Perubahan User Profile/Role" }).catch(console.error);
    return data as Profile;
  },

  async updateUserPassword(userId: string, password: string) {
    const { error } = await supabase.rpc('update_user_password_by_admin', {
      p_user_id: userId,
      p_password: password
    });
    if (error) throw new Error(error.message);
    auditService.log("UPDATE_USER_PASSWORD", { tableName: "profiles", recordId: userId, reason: "Ubah Password oleh Owner" }).catch(console.error);
    return true;
  },

  /**
   * Aktifkan / Nonaktifkan akun staf
   */
  async toggleUserActive(userId: string, isActive: boolean) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    auditService.log("UPDATE_USER", { tableName: "profiles", recordId: data.id, after: data, reason: "Perubahan User Profile/Role" }).catch(console.error);
    return data as Profile;
  },

  async createUser(payload: { full_name: string; email: string; role: string; branch_id?: string | null; password?: string }) {
    const defaultPassword = payload.password || 'password123';
    const { data, error } = await supabase.rpc('create_user_by_admin', {
      p_email: payload.email,
      p_password: defaultPassword,
      p_full_name: payload.full_name,
      p_role: payload.role,
      p_branch_id: payload.branch_id || null
    });
      
    if (error) throw new Error(error.message);
    auditService.log("TAMBAH_USER", { tableName: "profiles", recordId: data, after: payload, reason: "Penambahan Karyawan Baru" }).catch(console.error);
    return data;
  },

  async deleteUser(userId: string) {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) {
        const isFkError = 
          error.code === '23503' || 
          error.message?.toLowerCase().includes('foreign key') ||
          error.message?.toLowerCase().includes('violates foreign key');

        if (isFkError) {
          // Deactivate the user instead so transaction and audit histories remain intact
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              is_active: false,
              status: 'INACTIVE',
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (updateError) throw new Error(updateError.message);

          auditService.log("NONAKTIFKAN_USER", { 
            tableName: "profiles", 
            recordId: userId, 
            reason: "User dinonaktifkan otomatis karena memiliki riwayat transaksi/pergerakan stok" 
          }).catch(console.error);

          return {
            success: true,
            softDeleted: true,
            message: "User memiliki riwayat transaksi atau pergerakan stok sehingga tidak dapat dihapus permanen demi menjaga keabsahan pembukuan. Status user telah berhasil diubah menjadi NONAKTIF."
          };
        }
        throw new Error(error.message);
      }

      auditService.log("HAPUS_USER", { tableName: "profiles", recordId: userId, reason: "Penghapusan User Permanen" }).catch(console.error);
      return {
        success: true,
        softDeleted: false,
        message: "User berhasil dihapus permanen dari sistem."
      };
    } catch (err: any) {
      const isFkError = 
        err?.code === '23503' || 
        err?.message?.toLowerCase().includes('foreign key') ||
        err?.message?.toLowerCase().includes('violates foreign key');

      if (isFkError) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            is_active: false,
            status: 'INACTIVE',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (!updateError) {
          auditService.log("NONAKTIFKAN_USER", { 
            tableName: "profiles", 
            recordId: userId, 
            reason: "User dinonaktifkan otomatis karena memiliki riwayat transaksi/pergerakan stok" 
          }).catch(console.error);

          return {
            success: true,
            softDeleted: true,
            message: "User memiliki riwayat transaksi atau pergerakan stok sehingga tidak dapat dihapus permanen demi menjaga keabsahan pembukuan. Status user telah berhasil diubah menjadi NONAKTIF."
          };
        }
      }
      throw err;
    }
  }
};
