// ==============================================================================
// FILE: src/lib/services/suppliers.service.ts
// DESCRIPTION: Suppliers Management Service Layer
// ==============================================================================

import { supabase } from '@/lib/supabase/client';
import { Supplier } from './types';

export const suppliersService = {
  async getSuppliers(search?: string) {
    let query = supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,contact_person.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching suppliers:', error);
      throw new Error(error.message);
    }

    return (data || []) as Supplier[];
  },

  async getSupplierById(id: string) {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as Supplier;
  },

  async createSupplier(sup: Partial<Supplier>) {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        code: sup.code || `SUP-${Date.now().toString().slice(-4)}`,
        name: sup.name,
        contact_person: sup.contact_person || null,
        phone: sup.phone || null,
        email: sup.email || null,
        address: sup.address || null,
        bank_name: sup.bank_name || null,
        bank_account_number: sup.bank_account_number || null,
        bank_account_name: sup.bank_account_name || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Supplier;
  },

  async updateSupplier(id: string, sup: Partial<Supplier>) {
    const { data, error } = await supabase
      .from('suppliers')
      .update(sup)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Supplier;
  },

  async deleteSupplier(id: string) {
    const { error } = await supabase
      .from('suppliers')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw new Error(error.message);
    return true;
  }
};
