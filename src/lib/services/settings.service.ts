// ==============================================================================
// FILE: src/lib/services/settings.service.ts
// DESCRIPTION: Store Settings & Branches Configuration Service Layer
// ==============================================================================

import { supabase } from '@/lib/supabase/client';
import { StoreSettings, Branch } from './types';

export const settingsService = {
  async getStoreSettings() {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching store settings:', error);
      throw new Error(error.message);
    }

    return data as StoreSettings | null;
  },

  async updateStoreSettings(settings: Partial<StoreSettings>) {
    // Cek apakah sudah ada baris
    const existing = await settingsService.getStoreSettings();

    if (existing?.id) {
      const { data, error } = await supabase
        .from('store_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as StoreSettings;
    } else {
      const { data, error } = await supabase
        .from('store_settings')
        .insert({
          store_name: settings.store_name || 'Septy Softlens',
          receipt_header: settings.receipt_header || 'Septy Softlens POS',
          receipt_footer: settings.receipt_footer || 'Terima kasih atas kunjungan Anda!',
          phone: settings.phone || '',
          email: settings.email || '',
          address: settings.address || '',
          tax_percentage: settings.tax_percentage || 0,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as StoreSettings;
    }
  },

  async getBranches() {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('name');

    if (error) throw new Error(error.message);
    return (data || []) as Branch[];
  },

  async createBranch(branch: Partial<Branch>) {
    const { data, error } = await supabase
      .from('branches')
      .insert({
        branch_code: branch.branch_code || `BR-${Date.now().toString().slice(-4)}`,
        name: branch.name,
        address: branch.address || null,
        phone: branch.phone || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Branch;
  },

  async updateBranch(id: string, branch: Partial<Branch>) {
    const { data, error } = await supabase
      .from('branches')
      .update(branch)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Branch;
  },

  async getSubscriptionConfig() {
    const settings = await settingsService.getStoreSettings();
    const rolePerms = (settings as any)?.role_permissions || {};
    return {
      global: rolePerms.global_subscription || {
        default_ai_daily_limit: 50,
        default_expires_at: '2026-12-31',
      },
      accounts: (rolePerms.accounts_config || {}) as Record<string, {
        ai_daily_limit: number;
        expires_at: string;
        is_lifetime?: boolean;
        updated_at?: string;
      }>
    };
  },

  async updateAccountSubscription(accountKey: string, payload: {
    ai_daily_limit: number;
    expires_at: string;
    is_lifetime?: boolean;
    status?: string;
  }) {
    const settings = await settingsService.getStoreSettings();
    if (!settings?.id) throw new Error("Store settings belum dikonfigurasi");

    const currentPerms = (settings as any).role_permissions || {};
    const accountsConfig = { ...(currentPerms.accounts_config || {}) };

    accountsConfig[accountKey] = {
      ai_daily_limit: payload.ai_daily_limit,
      expires_at: payload.expires_at,
      is_lifetime: !!payload.is_lifetime,
      updated_at: new Date().toISOString()
    };

    const updatedPerms = {
      ...currentPerms,
      accounts_config: accountsConfig
    };

    const { error } = await supabase
      .from('store_settings')
      .update({
        role_permissions: updatedPerms,
        updated_at: new Date().toISOString()
      })
      .eq('id', settings.id);

    if (error) throw new Error(error.message);

    // Jika ada perubahan status akun, sinkronkan ke tabel profiles
    if (payload.status) {
      await supabase
        .from('profiles')
        .update({
          status: payload.status,
          is_active: payload.status === 'ACTIVE',
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${accountKey},email.ilike.${accountKey}`);
    }

    return accountsConfig[accountKey];
  }
};
