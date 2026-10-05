// ==============================================================================
// FILE: src/lib/services/users.service.ts
// DESCRIPTION: User Administration & Super Admin Email Confirmation Service Layer
// ==============================================================================

import { supabase } from '@/lib/supabase/client';
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
    return data as Profile;
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
    return data as Profile;
  }
};
