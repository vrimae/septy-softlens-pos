// ==============================================================================
// FILE: src/lib/services/products.service.ts
// DESCRIPTION: Products, Variants, Categories & Brands Service Layer
// ==============================================================================

import { supabase } from '@/lib/supabase/client';
import { Product, Category, Brand, ProductVariant } from './types';

export const productsService = {
  /**
   * Mengambil daftar produk beserta kategori, brand, dan varian
   */
  async getProducts(params?: {
    categoryId?: string;
    brandId?: string;
    search?: string;
    includeInactive?: boolean;
  }) {
    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, code),
        brand:brands(id, name, code),
        variants:product_variants(*)
      `)
      .order('name');

    if (!params?.includeInactive) {
      query = query.eq('is_active', true);
    }
    if (params?.categoryId) {
      query = query.eq('category_id', params.categoryId);
    }
    if (params?.brandId) {
      query = query.eq('brand_id', params.brandId);
    }
    if (params?.search) {
      query = query.or(`name.ilike.%${params.search}%,product_code.ilike.%${params.search}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching products:', error);
      throw new Error(error.message);
    }

    return (data || []) as Product[];
  },

  /**
   * Mengambil detail satu produk beserta variannya
   */
  async getProductById(id: string) {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, code),
        brand:brands(id, name, code),
        variants:product_variants(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    await auditService.log("TAMBAH_PRODUK", { tableName: "products", recordId: data.id, after: data, reason: "Penambahan Master Barang" });
    return data as Product;
  },

  /**
   * Tambah produk baru beserta varian default
   */
  async createProduct(
    productData: Partial<Product>,
    variantsData?: Partial<ProductVariant>[]
  ) {
    const { data: product, error: prodError } = await supabase
      .from('products')
      .insert({
        product_code: productData.product_code || `PRD-${Date.now().toString().slice(-6)}`,
        name: productData.name,
        category_id: productData.category_id || null,
        brand_id: productData.brand_id || null,
        cost_price: productData.cost_price || 0,
        price_regular: productData.price_regular || 0,
        price_member: productData.price_member || null,
        stock_global: productData.stock_global || 0,
        min_stock: productData.min_stock || 5,
        diameter: productData.diameter || null,
        base_curve: productData.base_curve || null,
        water_content: productData.water_content || null,
        replacement_period: productData.replacement_period || null,
        description: productData.description || null,
        image_url: productData.image_url || null,
        is_active: true,
      })
      .select()
      .single();

    if (prodError) {
      console.error('Error creating product:', prodError);
      throw new Error(prodError.message);
    }

    // Jika ada daftar varian spesifik
    if (variantsData && variantsData.length > 0) {
      const formattedVariants = variantsData.map(v => ({
        product_id: product.id,
        sku: v.sku || `SKU-${product.product_code}-${Date.now().toString().slice(-4)}`,
        barcode: v.barcode || null,
        variant_name: v.variant_name || product.name,
        power: v.power || null,
        color: v.color || null,
        cost_price: v.cost_price || product.cost_price,
        price_regular: v.price_regular || product.price_regular,
        stock: v.stock || 0,
        min_stock: v.min_stock || product.min_stock || 3,
        is_active: true,
      }));

      const { error: varError } = await supabase
        .from('product_variants')
        .insert(formattedVariants);

      if (varError) {
        console.error('Error creating variants:', varError);
      }
    } else {
      // Buat 1 varian standar secara otomatis
      await supabase.from('product_variants').insert({
        product_id: product.id,
        sku: `SKU-${product.product_code}-STD`,
        variant_name: `${product.name} (Standar)`,
        cost_price: product.cost_price,
        price_regular: product.price_regular,
        stock: product.stock_global,
        min_stock: product.min_stock,
        is_active: true,
      });
    }

    return product;
  },

  /**
   * Perbarui informasi produk
   */
  async updateProduct(id: string, productData: Partial<Product>) {
    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Hapus / Nonaktifkan produk (Soft Delete)
   */
  async deleteProduct(id: string) {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw new Error(error.message);
    await auditService.log("HAPUS_PRODUK", { tableName: "products", recordId: id, reason: "Penghapusan Data Barang" });
    return true;
  },

  // ================= KATEGORI =================
  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw new Error(error.message);
    return (data || []) as Category[];
  },

  async createCategory(cat: { name: string; target_margin?: number; use_expired?: boolean }) {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: cat.name,
        target_margin: cat.target_margin || 15,
        target_margin_percent: cat.target_margin || 15,
        use_expired: cat.use_expired || false,
        track_expired: cat.use_expired || false,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Category;
  },

  async updateCategory(id: string, cat: { name?: string; target_margin?: number; use_expired?: boolean }) {
    const updateData: any = {};
    if (cat.name !== undefined) updateData.name = cat.name;
    if (cat.target_margin !== undefined) {
      updateData.target_margin = cat.target_margin;
      updateData.target_margin_percent = cat.target_margin;
    }
    if (cat.use_expired !== undefined) {
      updateData.use_expired = cat.use_expired;
      updateData.track_expired = cat.use_expired;
    }

    const { data, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Category;
  },

  async deleteCategory(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  },

  // ================= BRAND =================
  async getBrands() {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name');

    if (error) throw new Error(error.message);
    return (data || []) as Brand[];
  },

  async createBrand(brand: { name: string; code?: string; country_of_origin?: string }) {
    const { data, error } = await supabase
      .from('brands')
      .insert({
        name: brand.name,
        code: brand.code || `BRD-${Date.now().toString().slice(-4)}`,
        country_of_origin: brand.country_of_origin || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Brand;
  },

  async updateBrand(id: string, brand: { name: string; code?: string; country_of_origin?: string }) {
    const { data, error } = await supabase
      .from('brands')
      .update(brand)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Brand;
  },

  async deleteBrand(id: string) {
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
};
