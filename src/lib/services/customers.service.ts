// ==============================================================================
// FILE: src/lib/services/customers.service.ts
// DESCRIPTION: Customers & Prescription Notes Service Layer
// ==============================================================================

import { supabase } from '@/lib/supabase/client';
import { Customer } from './types';

export const customersService = {
  /**
   * Mengambil daftar pelanggan (bisa difilter pencarian nama/telepon)
   */
  async getCustomers(search?: string) {
    let query = supabase
      .from('customers')
      .select('*')
      .order('name');

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,customer_code.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching customers:', error);
      throw new Error(error.message);
    }

    return (data || []) as Customer[];
  },

  /**
   * Mengambil detail pelanggan berdasarkan ID
   */
  async getCustomerById(id: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as Customer;
  },

  /**
   * Tambah pelanggan baru beserta catatan resep softlens
   */
  async createCustomer(customer: Partial<Customer>) {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        customer_code: customer.customer_code || `CUST-${Date.now().toString().slice(-4)}`,
        name: customer.name,
        phone: customer.phone || null,
        email: customer.email || null,
        address: customer.address || null,
        notes: customer.notes || null,
        prescription_data: customer.prescription_data || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      throw new Error(error.message);
    }

    return data as Customer;
  },

  /**
   * Perbarui profil pelanggan atau catatan resep
   */
  async updateCustomer(id: string, customer: Partial<Customer>) {
    const { data, error } = await supabase
      .from('customers')
      .update(customer)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Customer;
  },

  /**
   * Hapus data pelanggan
   */
  async deleteCustomer(id: string) {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
};
