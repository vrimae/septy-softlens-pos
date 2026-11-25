"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, UploadCloud, Edit2, Trash2, Printer, X, CheckCircle2, AlertCircle, Sparkles, RefreshCw, FileSpreadsheet, Zap } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { unwrap, scopeBranch, withBranch, friendlyError, getActiveProfileId } from "@/lib/supabase/db";
import { auditService } from "@/lib/services/audit.service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import * as XLSX from "xlsx";
import Barcode from 'react-barcode';
import useSWR from "swr";
import { printProductLabel } from "@/lib/receipt";

type Product = {
  id: string;
  product_code: string;
  name: string;
  cost_price: number;
  price_regular: number;
  price_gold: number;
  price_vip: number;
  stock_global: number;
  category_id?: string | null;
  expiry_date?: string | null;
  is_active?: boolean;
  categories?: { name: string } | null;
};

function getCategoryPrefix(categoryName: string, existingProductsInCat: { product_code?: string }[] = []): string {
  // 1. Cek apakah di kategori ini sudah ada produk yang memiliki format prefix yang konsisten (cth: "sf", "ey", "sfm", "ak")
  if (existingProductsInCat.length > 0) {
    const prefixes: Record<string, number> = {};
    for (const p of existingProductsInCat) {
      const match = (p.product_code || '').trim().match(/^([a-z0-9]+)[-_]/i);
      if (match) {
        const pref = match[1].toLowerCase();
        prefixes[pref] = (prefixes[pref] || 0) + 1;
      }
    }
    let topPref = '';
    let maxCount = 0;
    for (const pref in prefixes) {
      if (prefixes[pref] > maxCount) {
        maxCount = prefixes[pref];
        topPref = pref;
      }
    }
    if (topPref) return topPref;
  }

  if (!categoryName || !categoryName.trim()) return "pr";

  const cleanCat = categoryName.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = cleanCat.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    // Ambil huruf pertama dari 2 kata pertama, cth: "Lem Eyelash" -> "le", "Softlens Tool" -> "st"
    return (words[0][0] + words[1][0]).toLowerCase();
  } else if (words.length === 1) {
    // 1 kata, ambil 2 huruf pertama, cth: "Eyelash" -> "ey", "Nails" -> "na"
    return words[0].slice(0, 2).toLowerCase();
  }

  return "pr";
}

function parseIndoNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim().replace(/[^0-9.,]/g, '');
  if (!str) return 0;
  // Format ribuan koma Inggris: e.g. "45,000"
  if (str.includes(',') && !str.includes('.')) {
    if (/^\d{1,3}(,\d{3})+$/.test(str)) {
      return parseInt(str.replace(/,/g, ''), 10) || 0;
    }
  }
  // Format titik Indonesia: e.g. "45.000"
  if (str.includes('.') && !str.includes(',')) {
    if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
      return parseInt(str.replace(/\./g, ''), 10) || 0;
    }
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length === 3) {
      return parseInt(parts.join(''), 10) || 0;
    }
  }
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

function generateProductCode(
  name: string, 
  categoryName: string, 
  existingProducts: { product_code?: string; id?: string; categories?: { name: string } | null; category_id?: string | null }[] = [], 
  currentEditingId?: string | null,
  categoryId?: string | null
): string {
  // Generate kode jika ada nama atau kategori yang dimasukkan
  if (!name?.trim() && !categoryName?.trim()) return "";

  const otherProducts = existingProducts.filter(p => !currentEditingId || p.id !== currentEditingId);
  const existingSet = new Set(otherProducts.map(p => (p.product_code || '').trim().toLowerCase()));

  // Filter produk dalam kategori yang sama untuk mendeteksi prefix dan gaya penomoran
  const prodsInCat = otherProducts.filter(p => {
    if (categoryId && p.category_id === categoryId) return true;
    if (categoryName && p.categories?.name?.trim().toLowerCase() === categoryName.trim().toLowerCase()) return true;
    return false;
  });

  const prefix = getCategoryPrefix(categoryName, prodsInCat);

  // Cek preferensi digit padding kategori ini (3 digit cth: 001-999, atau 4 digit cth: 0001-9999)
  let padLength = 4;
  const regexPrefix = new RegExp(`^${prefix}[-_]?(\\d+)$`, 'i');
  let hasThreeDigits = false;
  let hasFourDigits = false;

  for (const p of otherProducts) {
    const code = (p.product_code || '').trim();
    const match = code.match(regexPrefix);
    if (match) {
      if (match[1].length === 3) hasThreeDigits = true;
      if (match[1].length >= 4) hasFourDigits = true;
    }
  }

  // Jika produk di kategori ini sudah konsisten 3 digit dan belum ada 4 digit, gunakan 3 digit (001-999)
  if (hasThreeDigits && !hasFourDigits) {
    padLength = 3;
  }

  // Mencari nomor urut berikutnya dari 1 sampai 999 (dan seterusnya hingga 99999 tanpa batas 30)
  let seq = 1;
  while (seq <= 99999) {
    const candPad = `${prefix}-${String(seq).padStart(padLength, '0')}`;
    const cand3 = `${prefix}-${String(seq).padStart(3, '0')}`;
    const cand4 = `${prefix}-${String(seq).padStart(4, '0')}`;

    // Pastikan tidak bentrok baik dengan format 3 digit maupun 4 digit
    const isTaken = 
      existingSet.has(candPad.toLowerCase()) || 
      existingSet.has(cand3.toLowerCase()) || 
      existingSet.has(cand4.toLowerCase());

    if (!isTaken) {
      return candPad;
    }
    seq++;
  }

  return `${prefix}-${String(seq).padStart(padLength, '0')}`;
}

function getStandardColumnKey(rawHeader: string): string {
  const h = rawHeader.toLowerCase().trim();
  // 1. Prioritaskan kolom Member & Diskon Khusus sebelum Jual/Normal
  if (h.includes('gold') || h.includes('reseller') || h.includes('member 1') || h.includes('grosir 1')) return 'Harga Gold';
  if (h.includes('vip') || h.includes('agen') || h.includes('member 2') || h.includes('grosir 2')) return 'Harga VIP';
  if (h.includes('beli') || h.includes('hpp') || h.includes('modal') || h.includes('pokok')) return 'HPP';
  if (h.includes('normal') || h.includes('jual') || h.includes('reguler') || h.includes('ecer') || h.includes('retail') || h === 'harga' || h === 'price') return 'Normal';
  
  if (h.includes('barcode')) return 'Barcode';
  if (h.includes('kode') || h === 'sku' || h === 'code') return 'Kode';
  if (h.includes('nama') || h.includes('name') || h.includes('produk') || h.includes('barang') || h.includes('item')) return 'Nama';
  if (h.includes('kategori') || h.includes('category')) return 'Kategori';
  if (h.includes('stok') || h.includes('stock') || h.includes('qty') || h.includes('jumlah')) return 'Stok';
  if (h.includes('kadaluarsa') || h.includes('kedaluwarsa') || h.includes('expired') || h.includes('exp')) return 'Expired';
  return rawHeader.trim();
}

interface ParsedProductRow {
  code: string;
  name: string;
  category: string;
  cost: number;
  regular: number;
  gold: number;
  vip: number;
  stock: number;
  expiryDate?: string;
  raw: any;
}

function extractProductFromRow(row: any): ParsedProductRow {
  const keys = Object.keys(row || {});
  
  const getVal = (regex: RegExp, excludeRegex?: RegExp) => {
    for (const k of keys) {
      const cleanK = k.trim();
      if (regex.test(cleanK) && (!excludeRegex || !excludeRegex.test(cleanK))) {
        const v = row[k];
        if (v !== undefined && v !== null && String(v).trim() !== '' && String(v) !== '#REF!') {
          return v;
        }
      }
    }
    return null;
  };

  // Kode / Barcode
  const rawCode = getVal(/^kode/i) ?? getVal(/^code/i) ?? getVal(/^sku/i) ?? getVal(/^barcode/i) ?? getVal(/(kode|sku|barcode|code)/i);
  const code = String(rawCode || '').trim();

  // Nama Produk
  const rawName = getVal(/^(nama|name|produk|barang|item)/i) ?? getVal(/(nama|name|produk|barang|item)/i);
  const name = String(rawName || '').trim();

  // Kategori
  const rawCat = getVal(/^(kategori|category)/i) ?? getVal(/(kategori|category)/i);
  const category = String(rawCat || 'Umum').trim();

  // HPP / Modal
  const cost = parseIndoNumber(getVal(/(modal|beli|hpp|pokok|cost)/i));

  // Harga Normal / Reguler
  const regular = parseIndoNumber(
    getVal(/(normal|reguler|jual|ecer|retail|harga\s*jual|harga)/i, /(gold|vip|reseller|agen|modal|beli|hpp|pokok)/i)
  );

  // Harga Gold (Prioritaskan Gold, Reseller, Member Gold, Grosir 1. Jika kosong otomatis -3k dari harga jual)
  const rawGold = parseIndoNumber(getVal(/(gold|reseller|member\s*gold|member\s*1|grosir\s*1)/i));
  const gold = rawGold > 0 ? rawGold : (regular > 3000 ? regular - 3000 : 0);

  // Harga VIP (Prioritaskan VIP, Agen, Member VIP, Grosir 2. Jika kosong otomatis -5k dari harga jual)
  const rawVip = parseIndoNumber(getVal(/(vip|agen|member\s*vip|member\s*2|grosir\s*2)/i));
  const vip = rawVip > 0 ? rawVip : (regular > 5000 ? regular - 5000 : 0);

  // Stok
  const rawStock = getVal(/(stok|stock|qty|jumlah)/i);
  const stock = rawStock !== null ? (parseInt(String(rawStock).replace(/[^0-9]/g, ''), 10) || 0) : 0;

  // Tanggal Kedaluwarsa
  let expiryDate: string | undefined = undefined;
  const rawExp = getVal(/(kadaluarsa|kedaluwarsa|expired|exp)/i);
  if (rawExp) {
    if (typeof rawExp === 'number') {
      const d = new Date(Math.round((rawExp - 25569) * 864e5));
      expiryDate = d.toISOString().split('T')[0];
    } else if (typeof rawExp === 'string') {
      try { expiryDate = new Date(rawExp).toISOString().split('T')[0]; } catch (e) {}
    }
  }

  return { code, name, category, cost, regular, gold, vip, stock, expiryDate, raw: row };
}

export default function ProductsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [productCode, setProductCode] = useState("");
  const [isCodeManual, setIsCodeManual] = useState(false);
  const [name, setName] = useState("");
  const [costPrice, setCostPrice] = useState("0");
  const [priceRegular, setPriceRegular] = useState("0");
  const [priceGold, setPriceGold] = useState("0");
  const [priceVip, setPriceVip] = useState("0");
  const [isGoldManual, setIsGoldManual] = useState(false);
  const [isVipManual, setIsVipManual] = useState(false);
  const [stock, setStock] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [excelMatchedInfo, setExcelMatchedInfo] = useState<string | null>(null);

  // Excel Import Dialog State
  const [importModalData, setImportModalData] = useState<{
    fileName: string;
    rows: ParsedProductRow[];
    totalCount: number;
    goldCount: number;
    vipCount: number;
    regCount: number;
    headerRowIdx: number;
  } | null>(null);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkImportProgress, setBulkImportProgress] = useState({ current: 0, total: 0, status: "" });

  // Sync Member Prices Dialog State
  const [isSyncMemberModalOpen, setIsSyncMemberModalOpen] = useState(false);
  const [isSyncingMemberPrices, setIsSyncingMemberPrices] = useState(false);
  const [matchedExcelRowForEdit, setMatchedExcelRowForEdit] = useState<ParsedProductRow | null>(null);

  // Koreksi Stok Modal
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Histori Stok Modal
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const { data: stockHistory = [], isValidating: isHistoryLoading } = useSWR(historyProduct ? `history_${historyProduct.id}` : null, async () => {
    const { data } = await supabase.from('stock_movements').select('*').eq('product_id', historyProduct!.id).order('created_at', { ascending: false }).limit(50);
    return data || [];
  });

  // Cetak Label Modal
  const [printProduct, setPrintProduct] = useState<Product | null>(null);

  const { data: categories = [], mutate: mutateCategories } = useSWR('categories_for_products', async () => {
    const { data } = await supabase.from('categories').select('id, name');
    return data || [];
  });

  const { data: products = [], mutate, isValidating } = useSWR('products_list', async () => {
    return (unwrap(await scopeBranch(
      supabase.from('products').select('*, categories(name)').is('deleted_at', null)
    ).order('created_at', { ascending: false })) as Product[]) || [];
  });
  const loading = !products.length && isValidating;

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p: any) => {
      // Category filter
      if (selectedCategory) {
        const catName = (p.categories?.name || 'Umum').toLowerCase();
        if (catName !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      if (!q) return true;

      const matchName = (p.name || "").toLowerCase().includes(q);
      const matchCode = (p.product_code || "").toLowerCase().includes(q);
      const matchCat = (p.categories?.name || "").toLowerCase().includes(q);

      return matchName || matchCode || matchCat;
    });
  }, [products, search, selectedCategory]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (!rawRows || rawRows.length === 0) {
          alert("File Excel kosong.");
          return;
        }

        const keywords = ['kode', 'nama', 'barang', 'kategori', 'category', 'harga', 'price', 'normal', 'stok', 'stock', 'hpp', 'beli', 'jual', 'gold', 'vip', 'member', 'reseller'];
        let bestIdx = -1;
        let maxScore = 0;

        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
          const row = rawRows[i] || [];
          const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
          if (nonEmptyCells.length < 2) continue;

          let score = 0;
          for (const cell of nonEmptyCells) {
            const text = String(cell).toLowerCase().trim();
            if (keywords.some(k => text === k || text.startsWith(k) || text.includes(k))) {
              score += 2;
            }
          }

          if (score > maxScore) {
            maxScore = score;
            bestIdx = i;
          }
        }

        const headerIdx = bestIdx >= 0 ? bestIdx : 0;
        const rawHeaders = (rawRows[headerIdx] || []).map(h => String(h || '').trim());
        const dataRows = rawRows.slice(headerIdx + 1);

        const parsedProducts: ParsedProductRow[] = [];
        const rawObjects: any[] = [];

        dataRows.forEach(row => {
          const rowObj: any = {};
          rawHeaders.forEach((h, colIdx) => {
            if (h) {
              let val = row[colIdx];
              if (val === '#REF!' || val === undefined || val === null) val = '';
              rowObj[h] = val;
              const stdKey = getStandardColumnKey(h);
              if (stdKey && !rowObj[stdKey]) {
                rowObj[stdKey] = val;
              }
            }
          });

          if (Object.values(rowObj).some(v => v !== undefined && v !== null && String(v).trim() !== '')) {
            const parsed = extractProductFromRow(rowObj);
            if (parsed.name.trim() || parsed.code.trim()) {
              parsedProducts.push(parsed);
              rawObjects.push(rowObj);
            }
          }
        });

        if (parsedProducts.length === 0) {
          alert("Tidak ditemukan baris data produk yang valid di file Excel.");
          return;
        }

        // Simpan ke localStorage untuk form auto-fill
        localStorage.setItem('excel_catalog', JSON.stringify(rawObjects));
        catalogRef.current = rawObjects;

        const goldCount = parsedProducts.filter(p => p.gold > 0).length;
        const vipCount = parsedProducts.filter(p => p.vip > 0).length;
        const regCount = parsedProducts.filter(p => p.regular > 0).length;

        // Buka Modal Konfirmasi Impor Otomatis
        setImportModalData({
          fileName: file.name,
          rows: parsedProducts,
          totalCount: parsedProducts.length,
          goldCount,
          vipCount,
          regCount,
          headerRowIdx: headerIdx + 1,
        });

      } catch (err) {
        console.error("Gagal membaca Excel:", err);
        alert("Gagal membaca file Excel. Pastikan formatnya benar.");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleBulkImportToDatabase = async (parsedList: ParsedProductRow[]) => {
    if (!parsedList || parsedList.length === 0) return;
    setIsBulkImporting(true);
    setBulkImportProgress({ current: 0, total: parsedList.length, status: "Menyiapkan kategori & data produk..." });

    try {
      // 1. Identifikasi dan sinkronisasi kategori
      const catMap = new Map<string, string>();
      categories.forEach((c: any) => {
        if (c?.name && c?.id) catMap.set(c.name.trim().toLowerCase(), c.id);
      });

      const uniqueCats = Array.from(new Set(parsedList.map(p => p.category.trim()).filter(Boolean)));
      for (const catName of uniqueCats) {
        const lower = catName.toLowerCase();
        if (!catMap.has(lower) && lower !== 'umum') {
          try {
            const { data: newCat } = await supabase.from('categories').insert(withBranch({ name: catName })).select().single();
            if (newCat?.id) {
              catMap.set(lower, newCat.id);
            }
          } catch (e) {
            console.warn("Gagal membuat kategori baru:", catName, e);
          }
        }
      }
      await mutateCategories();

      // 2. Query data produk yang sudah ada di database saat ini
      const { data: currentDbProducts } = await scopeBranch(
        supabase.from('products').select('id, product_code, name, cost_price, price_regular, price_gold, price_vip, stock_global, category_id').is('deleted_at', null) as any
      );

      const existingByCode = new Map<string, any>();
      const existingByName = new Map<string, any>();

      (currentDbProducts || []).forEach((p: any) => {
        if (p.product_code) existingByCode.set(p.product_code.trim().toLowerCase().replace(/\s+/g, ''), p);
        if (p.name) existingByName.set(p.name.trim().toLowerCase(), p);
      });

      let updatedCount = 0;
      let insertedCount = 0;
      let goldUpdatedCount = 0;
      let vipUpdatedCount = 0;

      // 3. Proses perulangan untuk insert / update
      for (let i = 0; i < parsedList.length; i++) {
        const item = parsedList[i];
        if (i % 5 === 0 || i === parsedList.length - 1) {
          setBulkImportProgress({
            current: i + 1,
            total: parsedList.length,
            status: `Menyinkronkan ${item.name || item.code} (${i + 1}/${parsedList.length})...`
          });
        }

        const catId = catMap.get(item.category.toLowerCase()) || null;
        const cleanCode = item.code.trim().toLowerCase().replace(/\s+/g, '');
        const cleanName = item.name.trim().toLowerCase();

        const existing = (cleanCode ? existingByCode.get(cleanCode) : null) || (cleanName ? existingByName.get(cleanName) : null);

        if (existing) {
          // Update produk yang sudah ada
          const updatePayload: any = {};
          if (item.name && item.name !== existing.name) updatePayload.name = item.name;
          if (item.regular > 0) updatePayload.price_regular = item.regular;
          if (item.cost > 0) updatePayload.cost_price = item.cost;
          if (item.gold > 0) {
            updatePayload.price_gold = item.gold;
            goldUpdatedCount++;
          }
          if (item.vip > 0) {
            updatePayload.price_vip = item.vip;
            vipUpdatedCount++;
          }
          if (catId && catId !== existing.category_id) updatePayload.category_id = catId;
          if (item.stock > 0 && (existing.stock_global === 0 || existing.stock_global === null)) {
            updatePayload.stock_global = item.stock;
          }

          if (Object.keys(updatePayload).length > 0) {
            unwrap(await supabase.from('products').update(updatePayload).eq('id', existing.id));
            updatedCount++;
          }
        } else {
          // Insert produk baru
          let finalCode = item.code.trim();
          if (!finalCode) {
            finalCode = generateProductCode(item.name, item.category, currentDbProducts || []);
          }

          const insertPayload: any = {
            product_code: finalCode,
            name: item.name || finalCode,
            cost_price: item.cost || 0,
            price_regular: item.regular || 0,
            price_gold: item.gold || 0,
            price_vip: item.vip || 0,
            stock_global: item.stock || 0,
            category_id: catId,
            expiry_date: item.expiryDate || null,
          };

          if (item.gold > 0) goldUpdatedCount++;
          if (item.vip > 0) vipUpdatedCount++;

          const created = unwrap(await supabase.from('products').insert(withBranch(insertPayload)).select('id').single());
          if (created?.id) {
            insertedCount++;
            if (item.stock > 0) {
              try {
                unwrap(await supabase.from('stock_movements').insert(withBranch({
                  product_id: created.id,
                  movement_type: 'INITIAL',
                  qty_change: item.stock,
                  qty_after: item.stock,
                  reference_table: 'products',
                  notes: 'Impor awal dari Excel',
                  created_by: getActiveProfileId(),
                })));
              } catch (e) {}
            }
          }
        }
      }

      auditService.log("IMPORT_EXCEL", {
        tableName: "products",
        after: {
          total: parsedList.length,
          updated: updatedCount,
          inserted: insertedCount,
          goldCount: goldUpdatedCount,
          vipCount: vipUpdatedCount
        }
      });

      await mutate();
      setImportModalData(null);
      alert(`✅ Berhasil menyinkronkan data Excel ke Database!\n\n• Total Produk: ${parsedList.length}\n• Diperbarui: ${updatedCount} produk\n• Ditambahkan Baru: ${insertedCount} produk\n• Harga Gold Aktif: ${goldUpdatedCount} produk\n• Harga VIP Aktif: ${vipUpdatedCount} produk\n\nHarga member Gold dan VIP kini langsung aktif saat transaksi di POS.`);
    } catch (err: any) {
      alert(`Gagal mengimpor ke database: ${friendlyError(err)}`);
    } finally {
      setIsBulkImporting(false);
    }
  };

  const handleAutoGenerateMissingMemberPrices = async () => {
    const zeroProducts = products.filter((p: any) => 
      (!p.price_gold || Number(p.price_gold) === 0) || 
      (!p.price_vip || Number(p.price_vip) === 0)
    );

    if (zeroProducts.length === 0) {
      alert("Semua produk sudah memiliki Harga Gold dan VIP!");
      return;
    }

    if (!confirm(`Ditemukan ${zeroProducts.length} produk yang belum memiliki Harga Gold & VIP.\n\nApakah Anda ingin mengisi otomatis harga member (Gold diskon ~5%, VIP diskon ~10%) dari harga reguler sekarang?`)) {
      return;
    }

    setIsSyncingMemberPrices(true);
    try {
      let count = 0;
      for (const p of zeroProducts) {
        const reg = Number(p.price_regular || 0);
        if (reg <= 0) continue;

        const currentGold = Number(p.price_gold || 0);
        const currentVip = Number(p.price_vip || 0);

        const newGold = currentGold > 0 ? currentGold : Math.round((reg * 0.95) / 500) * 500;
        const newVip = currentVip > 0 ? currentVip : Math.round((reg * 0.90) / 500) * 500;

        unwrap(await supabase.from('products').update({
          price_gold: newGold,
          price_vip: newVip
        }).eq('id', p.id));
        count++;
      }

      await mutate();
      alert(`✅ Sukses memperbarui Harga Member untuk ${count} produk!`);
      setIsSyncMemberModalOpen(false);
    } catch (err: any) {
      alert(`Gagal memperbarui harga member: ${friendlyError(err)}`);
    } finally {
      setIsSyncingMemberPrices(false);
    }
  };

  const handleAutoCalculateMemberPrices = () => {
    const reg = parseFloat(priceRegular) || 0;
    if (reg <= 0) {
      alert("Masukkan Harga Reguler / Jual terlebih dahulu untuk menghitung Harga Member.");
      return;
    }
    const goldCalc = Math.max(0, reg - 3000);
    const vipCalc = Math.max(0, reg - 5000);
    setPriceGold(String(goldCalc));
    setPriceVip(String(vipCalc));
    setIsGoldManual(false);
    setIsVipManual(false);
  };

  const handlePriceRegularChange = (val: string) => {
    setPriceRegular(val);
    const reg = parseFloat(val) || 0;
    // Potongan harga otomatis: -3k untuk gold dan -5k untuk vip saat menambahkan produk
    if (!editingId || !isGoldManual) {
      setPriceGold(reg > 0 ? String(Math.max(0, reg - 3000)) : "0");
    }
    if (!editingId || !isVipManual) {
      setPriceVip(reg > 0 ? String(Math.max(0, reg - 5000)) : "0");
    }
  };

  const handlePriceGoldChange = (val: string) => {
    setPriceGold(val);
    setIsGoldManual(true);
  };

  const handlePriceVipChange = (val: string) => {
    setPriceVip(val);
    setIsVipManual(true);
  };

  const fetchProducts = async () => {
    await mutate();
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setProductCode("");
    setIsCodeManual(false);
    setName("");
    setCostPrice("0");
    setPriceRegular("0");
    setPriceGold("0");
    setPriceVip("0");
    setIsGoldManual(false);
    setIsVipManual(false);
    setStock("0");
    setCategoryId("");
    setExpiryDate("");
    setExcelMatchedInfo(null);
    setMatchedExcelRowForEdit(null);
    setIsModalOpen(true);
  };

  // Fetch local catalog on modal open
  const catalogRef = useRef<any[]>([]);
  useEffect(() => {
    if (isModalOpen) {
      const saved = localStorage.getItem('excel_catalog');
      if (saved) {
        try {
          catalogRef.current = JSON.parse(saved);
        } catch (e) { }
      }
    }
  }, [isModalOpen]);

  const fillDataFromExcelMatch = async (match: any, overwriteCode = true) => {
    const parsed = extractProductFromRow(match);

    if (overwriteCode && parsed.code && parsed.code.toLowerCase() !== '#ref!') {
      setProductCode(parsed.code);
    }

    if (parsed.name && parsed.name.toLowerCase() !== 'nama') {
      setName(parsed.name);
    }

    // Regular / Normal Price
    if (parsed.regular > 0) {
      setPriceRegular(String(parsed.regular));
    }

    // Cost Price / HPP
    if (parsed.cost > 0) {
      setCostPrice(String(parsed.cost));
    }

    // Gold Price (Otomatis dari Excel atau -3k dari harga reguler)
    if (parsed.gold > 0) {
      setPriceGold(String(parsed.gold));
      setIsGoldManual(false);
    } else if (parsed.regular > 3000) {
      setPriceGold(String(parsed.regular - 3000));
      setIsGoldManual(false);
    }

    // VIP Price (Otomatis dari Excel atau -5k dari harga reguler)
    if (parsed.vip > 0) {
      setPriceVip(String(parsed.vip));
      setIsVipManual(false);
    } else if (parsed.regular > 5000) {
      setPriceVip(String(parsed.regular - 5000));
      setIsVipManual(false);
    }

    // Stock
    if (parsed.stock > 0) {
      setStock(String(parsed.stock));
    }

    // Category
    if (parsed.category && parsed.category.toLowerCase() !== 'kategori' && parsed.category.toLowerCase() !== 'umum') {
      let foundCat = categories.find((c: any) => c.name.toLowerCase() === parsed.category.toLowerCase());
      if (foundCat) {
        setCategoryId(foundCat.id);
      } else {
        try {
          const { data: newCat } = await supabase.from('categories').insert(withBranch({ name: parsed.category })).select().single();
          if (newCat) {
            mutateCategories();
            setCategoryId(newCat.id);
          }
        } catch (e) {
          console.warn("Gagal auto-create category:", e);
        }
      }
    }

    // Expiry
    if (parsed.expiryDate) {
      setExpiryDate(parsed.expiryDate);
    }

    if (parsed.name) {
      const details = [
        `Normal: Rp ${parsed.regular.toLocaleString('id-ID')}`,
        parsed.gold > 0 ? `Gold: Rp ${parsed.gold.toLocaleString('id-ID')}` : null,
        parsed.vip > 0 ? `VIP: Rp ${parsed.vip.toLocaleString('id-ID')}` : null,
      ].filter(Boolean).join(' | ');
      setExcelMatchedInfo(`✨ Data Excel: ${parsed.name} (${details})`);
    }
  };

  const applyAutofillOrCode = (newName: string, newCatId: string, forceRegenerate = false) => {
    const catObj = categories.find((c: any) => c.id === newCatId);
    const catName = catObj?.name || "";

    // 1. Cek apakah ada di Excel catalog lokal berdasarkan Nama (hanya untuk barang baru)
    if (!editingId && catalogRef.current.length > 0 && newName.trim()) {
      const cleanVal = newName.trim().toLowerCase();
      const match = catalogRef.current.find((row: any) => {
        const parsed = extractProductFromRow(row);
        const rowName = (parsed.name || '').trim().toLowerCase();
        return rowName && rowName === cleanVal;
      });

      if (match) {
        fillDataFromExcelMatch(match, !isCodeManual || forceRegenerate);
        return;
      }
    }

    // 2. Auto-generate kode produk dari nama & kategori (berlaku baik tambah baru maupun edit)
    if (!isCodeManual || forceRegenerate) {
      if (newName.trim() || catName.trim()) {
        const autoCode = generateProductCode(newName, catName, products, editingId, newCatId);
        setProductCode(autoCode);
      } else {
        setProductCode("");
      }
    }
  };

  const handleCodeChange = (val: string) => {
    setProductCode(val);
    setIsCodeManual(true);
    setExcelMatchedInfo(null);

    const cleanVal = val.trim().toLowerCase().replace(/\s+/g, '');
    if (!cleanVal || cleanVal === '#ref!') return;

    // 1. Cek di catalog Excel berdasarkan Kode
    if (catalogRef.current.length > 0) {
      const match = catalogRef.current.find((row: any) => {
        const parsed = extractProductFromRow(row);
        const rowCode = (parsed.code || '').trim().toLowerCase().replace(/\s+/g, '');
        return rowCode && rowCode === cleanVal;
      });

      if (match) {
        fillDataFromExcelMatch(match, false);
        return;
      }
    }

    // 2. Cek di database produk yang sudah ada (jika mode tambah baru)
    if (!editingId && products.length > 0) {
      const existing = products.find(p => (p.product_code || '').trim().toLowerCase().replace(/\s+/g, '') === cleanVal);
      if (existing) {
        setName(existing.name || "");
        setPriceRegular(String(existing.price_regular || 0));
        setCostPrice(String(existing.cost_price || 0));
        setPriceGold(String(existing.price_gold || 0));
        setPriceVip(String(existing.price_vip || 0));
        if (existing.category_id) setCategoryId(existing.category_id);
        if (existing.expiry_date) setExpiryDate(existing.expiry_date.split('T')[0]);
        setExcelMatchedInfo(`Produk tersimpan: ${existing.name}`);
      }
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    setExcelMatchedInfo(null);

    const cleanVal = val.trim().toLowerCase();
    if (catalogRef.current.length > 0 && cleanVal) {
      const match = catalogRef.current.find((row: any) => {
        const parsed = extractProductFromRow(row);
        const rowName = (parsed.name || '').trim().toLowerCase();
        return rowName && rowName === cleanVal;
      });

      if (match) {
        fillDataFromExcelMatch(match, !isCodeManual);
        return;
      }
    }

    applyAutofillOrCode(val, categoryId);
  };

  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    setIsCodeManual(false);
    applyAutofillOrCode(name, catId, true);
  };

  const handleRegenerateCode = () => {
    setIsCodeManual(false);
    applyAutofillOrCode(name, categoryId, true);
  };

  const handleOpenEditModal = (p: any) => {
    setEditingId(p.id);
    setProductCode(p.product_code || "");
    setIsCodeManual(false);
    setName(p.name);
    setCostPrice((p.cost_price || 0).toString());
    setPriceRegular((p.price_regular || 0).toString());
    setPriceGold((p.price_gold || 0).toString());
    setPriceVip((p.price_vip || 0).toString());
    setIsGoldManual(true);
    setIsVipManual(true);
    setStock((p.stock_global || 0).toString());
    setExpiryDate(p.expiry_date ? p.expiry_date.split('T')[0] : "");
    setExcelMatchedInfo(null);
    setMatchedExcelRowForEdit(null);
    
    let cId = p.category_id || "";
    if (!cId && p.categories?.name && categories.length > 0) {
      const match = categories.find((c: any) => c.name === p.categories?.name);
      if (match) cId = match.id;
    }
    setCategoryId(cId);

    // Cek apakah ada data di catalog Excel yang cocok dengan produk ini
    if (catalogRef.current.length > 0) {
      const cleanPCode = (p.product_code || '').trim().toLowerCase().replace(/\s+/g, '');
      const cleanPName = (p.name || '').trim().toLowerCase();
      const match = catalogRef.current.find((row: any) => {
        const parsed = extractProductFromRow(row);
        const rowCode = (parsed.code || '').trim().toLowerCase().replace(/\s+/g, '');
        const rowName = (parsed.name || '').trim().toLowerCase();
        return (rowCode && cleanPCode && rowCode === cleanPCode) || (rowName && cleanPName && rowName === cleanPName);
      });

      if (match) {
        const parsed = extractProductFromRow(match);
        setMatchedExcelRowForEdit(parsed);
        const details = [
          `Reguler: Rp ${parsed.regular.toLocaleString('id-ID')}`,
          parsed.gold > 0 ? `Gold: Rp ${parsed.gold.toLocaleString('id-ID')}` : null,
          parsed.vip > 0 ? `VIP: Rp ${parsed.vip.toLocaleString('id-ID')}` : null,
        ].filter(Boolean).join(' | ');
        setExcelMatchedInfo(`Data Excel Ditemukan: ${details}`);
      }
    }

    setIsModalOpen(true);
  };

  // Soft delete: products referenced by past sales cannot be physically removed,
  // and reports must keep showing their names.
  const handleDelete = async (id: string) => {
    if (!confirm("Hapus barang ini?")) return;
    try {
      const prodToDelete = products.find((p: any) => p.id === id);
      const freedCode = prodToDelete?.product_code 
        ? `${prodToDelete.product_code}__del_${id.slice(0, 8)}` 
        : undefined;
      const payload: any = { deleted_at: new Date().toISOString() };
      if (freedCode) payload.product_code = freedCode;

      unwrap(await supabase.from('products').update(payload).eq('id', id));
      auditService.log("HAPUS_BARANG", { tableName: "products", recordId: id });
      fetchProducts();
    } catch (err) {
      alert(friendlyError(err));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !productCode.trim()) return;

    const newStock = Math.max(0, parseInt(stock) || 0);
    const prices = [costPrice, priceRegular, priceGold, priceVip].map(v => parseFloat(v) || 0);
    if (prices.some(v => v < 0)) return alert("Harga tidak boleh negatif.");

    setIsSubmitting(true);
    try {
      const payload: any = {
        product_code: productCode.trim(),
        name: name.trim(),
        cost_price: prices[0],
        price_regular: prices[1],
        price_gold: prices[2],
        price_vip: prices[3],
        stock_global: newStock,
        expiry_date: expiryDate ? expiryDate : null,
      };
      
      if (categoryId) {
        payload.category_id = categoryId;
      }

      if (editingId) {
        const before = products.find((p: any) => p.id === editingId);
        unwrap(await supabase.from('products').update(payload).eq('id', editingId));
        const diff = newStock - (before?.stock_global ?? newStock);
        if (diff !== 0) {
          unwrap(await supabase.from('stock_movements').insert(withBranch({
            product_id: editingId, movement_type: 'ADJUSTMENT', qty_change: diff, qty_after: newStock,
            reference_table: 'products', notes: 'Koreksi stok dari Master Barang', created_by: getActiveProfileId(),
          })));
        }
        auditService.log("UBAH_BARANG", { tableName: "products", recordId: editingId, before, after: payload });
      } else {
        const created = unwrap(await supabase.from('products').insert(withBranch(payload)).select('id').single());
        if (created?.id) {
          if (newStock > 0) {
            unwrap(await supabase.from('stock_movements').insert(withBranch({
              product_id: created.id, movement_type: 'INITIAL', qty_change: newStock, qty_after: newStock,
              reference_table: 'products', notes: 'Stok awal', created_by: getActiveProfileId(),
            })));
          }
          auditService.log("TAMBAH_BARANG", { tableName: "products", recordId: created.id, after: payload });
        }
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      alert(friendlyError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct || !adjustQty) return;
    const diff = parseInt(adjustQty);
    if (isNaN(diff) || diff === 0) return alert("Kuantitas harus diisi dan tidak boleh 0");
    
    setIsAdjusting(true);
    try {
      const qtyAfter = (adjustProduct.stock_global || 0) + diff;
      unwrap(await supabase.from('products').update({ stock_global: qtyAfter }).eq('id', adjustProduct.id));
      unwrap(await supabase.from('stock_movements').insert(withBranch({
        product_id: adjustProduct.id, 
        movement_type: 'ADJUSTMENT', 
        qty_change: diff, 
        qty_after: qtyAfter,
        reference_table: 'products', 
        notes: adjustNote || 'Koreksi stok manual', 
        created_by: getActiveProfileId(),
      })));
      
      auditService.log("UBAH_BARANG", { tableName: "products", recordId: adjustProduct.id, before: { stock_global: adjustProduct.stock_global }, after: { stock_global: qtyAfter } });
      setAdjustProduct(null);
      setAdjustQty("");
      setAdjustNote("");
      fetchProducts();
    } catch (err: any) {
      alert(friendlyError(err));
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-normal">Master Barang</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Kelola data stok dan harga produk softlens.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Button onClick={handleOpenAddModal} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm h-11 flex-1 sm:flex-none justify-center">
            <Plus className="h-4 w-4 mr-2" /> Tambah Produk Baru
          </Button>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <Button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-sm h-11 flex-1 sm:flex-none justify-center"
          >
            <UploadCloud className="h-4 w-4 mr-2" /> Upload Excel
          </Button>
          <Button 
            onClick={() => setIsSyncMemberModalOpen(true)}
            variant="outline"
            className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold shadow-sm h-11 flex-1 sm:flex-none justify-center"
            title="Kelola & sinkronkan harga member Gold dan VIP"
          >
            <Zap className="h-4 w-4 mr-1.5 text-amber-500" /> Sinkron Harga Member
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden p-1">
        <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-800/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input 
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama barang, kode, atau barcode..."
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                className="w-full pl-9 pr-9 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
              {search && (
                <button 
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label="Hapus pencarian"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="py-2.5 px-3 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-700 dark:text-gray-200"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between md:justify-end gap-2 px-1">
            <span>
              Menampilkan <span className="font-semibold text-gray-900 dark:text-white">{filteredProducts.length}</span> dari {products.length} barang
            </span>
            {(search || selectedCategory) && (
              <button
                type="button"
                onClick={() => { setSearch(""); setSelectedCategory(""); }}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold underline text-xs ml-1"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
        
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow className="bg-white dark:bg-[#13151a] hover:bg-white dark:bg-[#13151a] border-b-0">
              <TableHead className="font-bold text-gray-600 dark:text-gray-400 py-4 px-6 w-[12%]">Kode</TableHead>
              <TableHead className="font-bold text-gray-600 dark:text-gray-400 py-4 px-6 w-[23%]">Nama Produk</TableHead>
              <TableHead className="font-bold text-gray-600 dark:text-gray-400 py-4 px-6 w-[12%]">Kategori</TableHead>
              <TableHead className="font-bold text-gray-600 dark:text-gray-400 py-4 px-6 w-[20%]">Harga (Reguler / Member)</TableHead>
              <TableHead className="font-bold text-gray-600 dark:text-gray-400 py-4 px-6 text-center w-[8%]">Stok</TableHead>
              <TableHead className="font-bold text-gray-600 dark:text-gray-400 py-4 px-6 text-right w-[25%]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10">Memuat...</TableCell></TableRow>
            ) : products.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-16 text-gray-500 dark:text-gray-400">Belum ada data barang.</TableCell></TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-14 text-gray-500 dark:text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="font-medium text-gray-700 dark:text-gray-200">
                      Tidak ada barang yang cocok dengan pencarian "{search || selectedCategory}"
                    </p>
                    <button
                      type="button"
                      onClick={() => { setSearch(""); setSelectedCategory(""); }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    >
                      Hapus Filter Pencarian
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((p: any) => (
                <TableRow key={p.id} className="border-b border-gray-50 hover:bg-gray-50 dark:hover:bg-[#2a303c] dark:bg-[#1e2329]/50">
                  <TableCell className="px-6 font-semibold text-gray-500 dark:text-gray-400 text-xs">{p.product_code}</TableCell>
                  <TableCell className="px-6">
                    <div className="font-bold text-gray-900 dark:text-gray-100">{p.name}</div>
                    {p.is_active === false && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-sm uppercase tracking-wider">Nonaktif</span>
                    )}
                  </TableCell>
                  <TableCell className="px-6">
                    <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-md">
                      {p.categories?.name || 'Umum'}
                    </span>
                  </TableCell>
                  <TableCell className="px-6">
                    <div className="font-bold text-gray-900 dark:text-gray-100">
                      Rp {Number(p.price_regular || 0).toLocaleString('id-ID')}
                    </div>
                    {(Number(p.price_gold || 0) > 0 || Number(p.price_vip || 0) > 0) ? (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                        {Number(p.price_gold || 0) > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            Gold: Rp {Number(p.price_gold).toLocaleString('id-ID')}
                          </span>
                        )}
                        {Number(p.price_vip || 0) > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            VIP: Rp {Number(p.price_vip).toLocaleString('id-ID')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 block mt-0.5">
                        Member: sama dgn reguler
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 text-center">
                    <div className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-emerald-100 text-emerald-600 font-bold text-xs rounded-full">
                      {p.stock_global}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 text-right space-x-2 whitespace-nowrap">
                    <button onClick={() => setPrintProduct(p)} className="text-[11px] font-bold px-2.5 py-1.5 rounded-md text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                      Cetak Label
                    </button>
                    <button onClick={() => setHistoryProduct(p)} className="text-[11px] font-bold px-2.5 py-1.5 rounded-md text-purple-600 bg-purple-100 hover:bg-purple-200 transition-colors">
                      Histori Stok
                    </button>
                    <button onClick={() => handleOpenEditModal(p)} className="text-[11px] font-bold px-2.5 py-1.5 rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 transition-colors">
                      Edit
                    </button>
                    <button onClick={() => { setAdjustProduct(p); setAdjustQty(""); setAdjustNote(""); }} className="text-[11px] font-bold px-2.5 py-1.5 rounded-md text-amber-600 bg-amber-100 hover:bg-amber-200 transition-colors">
                      Koreksi Stok
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="text-[11px] font-bold px-2.5 py-1.5 rounded-md text-red-500 bg-red-100 hover:bg-red-200 transition-colors">
                      Hapus
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Barang" : "Tambah Barang Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto px-1">
            {matchedExcelRowForEdit && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> Ditemukan di File Excel
                  </span>
                  <div className="text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Reguler: Rp {matchedExcelRowForEdit.regular.toLocaleString('id-ID')} | Gold: Rp {matchedExcelRowForEdit.gold.toLocaleString('id-ID')} | VIP: Rp {matchedExcelRowForEdit.vip.toLocaleString('id-ID')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fillDataFromExcelMatch(matchedExcelRowForEdit.raw || matchedExcelRowForEdit, false)}
                  className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  Terapkan
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nama Barang</label>
                <input 
                  required 
                  type="text" 
                  placeholder="Cth: New Bluk Hazel -2.50"
                  value={name} 
                  onChange={(e) => handleNameChange(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-lg" 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Kategori</label>
                <select 
                  value={categoryId} 
                  onChange={(e) => handleCategoryChange(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-[#1e2329]"
                >
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Kode Barang</label>
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    title="Generate ulang kode dari kategori"
                  >
                    Auto
                  </button>
                </div>
                <input 
                  required 
                  type="text" 
                  placeholder="Ketik/scan kode atau terisi otomatis..."
                  value={productCode} 
                  onChange={(e) => handleCodeChange(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-lg bg-gray-50/50 dark:bg-[#1e2329] font-mono text-sm" 
                />
                {excelMatchedInfo && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block animate-pulse"></span>
                    {excelMatchedInfo}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Stok Awal</label>
                <input required type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Kadaluarsa</label>
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Harga Pokok (HPP) / Modal</label>
              <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-gray-50 dark:bg-[#1e2329]" placeholder="0" />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2 border-t">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Harga Jual / Reguler *</label>
                <input required type="number" value={priceRegular} onChange={(e) => handlePriceRegularChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg border-slate-200 dark:border-slate-800" placeholder="0" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-amber-700 dark:text-amber-400">Harga Gold</label>
                  <span className="text-[10px] text-amber-600 dark:text-amber-500 font-semibold">{isGoldManual ? "(Manual)" : "(-3k Otomatis)"}</span>
                </div>
                <input type="number" value={priceGold} onChange={(e) => handlePriceGoldChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg border-amber-300 bg-amber-50/20" placeholder="0" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-purple-700 dark:text-purple-400">Harga VIP</label>
                  <span className="text-[10px] text-purple-600 dark:text-purple-500 font-semibold">{isVipManual ? "(Manual)" : "(-5k Otomatis)"}</span>
                </div>
                <input type="number" value={priceVip} onChange={(e) => handlePriceVipChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg border-purple-300 bg-purple-50/20" placeholder="0" />
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border text-xs">
              <span className="text-gray-600 dark:text-gray-400">
                💡 Harga Gold otomatis -Rp 3.000 dan VIP -Rp 5.000 dari Harga Jual. Anda tetap bisa menyesuaikannya secara manual.
              </span>
              <button
                type="button"
                onClick={handleAutoCalculateMemberPrices}
                className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0 ml-2"
                title="Hitung ulang otomatis: Gold (-3k) dan VIP (-5k) dari harga reguler"
              >
                <Sparkles className="h-3.5 w-3.5" /> Hitung Ulang (-3k / -5k)
              </button>
            </div>
            
            <DialogFooter className="pt-4 mt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Barang"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Koreksi Stok */}
      <Dialog open={!!adjustProduct} onOpenChange={(o) => !o && setAdjustProduct(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Koreksi Stok: {adjustProduct?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdjustStock} className="space-y-4 pt-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Stok Saat Ini</label>
              <div className="px-3 py-2 bg-gray-50 border rounded-lg text-gray-500 font-semibold">{adjustProduct?.stock_global || 0}</div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Perubahan (+/-)</label>
              <input required type="number" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Contoh: -5 atau 10" />
              <p className="text-xs text-gray-400 mt-1">Gunakan minus (-) untuk mengurangi stok.</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Catatan</label>
              <input type="text" value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Alasan koreksi..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdjustProduct(null)}>Batal</Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={isAdjusting}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Histori Stok */}
      <Dialog open={!!historyProduct} onOpenChange={(o) => !o && setHistoryProduct(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Histori Stok: {historyProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto mt-4 pr-1">
            {isHistoryLoading ? (
              <div className="text-center py-10">Memuat histori...</div>
            ) : stockHistory.length === 0 ? (
              <div className="text-center py-10 text-gray-500">Belum ada riwayat pergerakan stok.</div>
            ) : (
              <div className="space-y-3">
                {stockHistory.map((h: any) => (
                  <div key={h.id} className="flex justify-between items-center p-3 border rounded-lg bg-gray-50 dark:bg-[#1e2329]">
                    <div>
                      <div className="font-bold text-sm text-gray-800 dark:text-gray-200">{h.movement_type}</div>
                      <div className="text-xs text-gray-500">{new Date(h.created_at).toLocaleString('id-ID')}</div>
                      <div className="text-xs text-gray-600 mt-1">{h.notes}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${h.qty_change > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {h.qty_change > 0 ? '+' : ''}{h.qty_change}
                      </div>
                      <div className="text-xs text-gray-400">Sisa: {h.qty_after}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Cetak Label Barcode */}
      <Dialog open={!!printProduct} onOpenChange={(o) => { if (!o) setPrintProduct(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Cetak Label Barcode</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-5 bg-slate-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl my-3">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center max-w-[240px] w-full" id="barcode-preview-area">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Septy Softlens</span>
              <p className="font-bold text-center text-gray-900 text-sm mb-1 leading-tight line-clamp-2">{printProduct?.name}</p>
              <p className="text-sm font-extrabold text-blue-600 mb-2">Rp {(printProduct?.price_regular || 0).toLocaleString('id-ID')}</p>
              {printProduct?.product_code && (
                <div className="w-full flex justify-center overflow-hidden">
                  <Barcode value={printProduct.product_code} width={1.3} height={38} fontSize={12} background="transparent" />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setPrintProduct(null)}>Tutup</Button>
            <Button 
              type="button" 
              onClick={() => {
                if (!printProduct) return;
                const svgElem = document.querySelector('#barcode-preview-area svg');
                const svgHtml = svgElem ? svgElem.outerHTML : '';
                printProductLabel({
                  name: printProduct.name,
                  price: printProduct.price_regular || 0,
                  code: printProduct.product_code,
                  storeName: "Septy Softlens",
                }, svgHtml);
              }} 
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
            >
              <Printer className="h-4 w-4 mr-2" /> Cetak Label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Impor Excel */}
      <Dialog open={!!importModalData} onOpenChange={(o) => { if (!o && !isBulkImporting) setImportModalData(null); }}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              Konfirmasi Impor Data Excel
            </DialogTitle>
          </DialogHeader>

          {importModalData && (
            <div className="flex-1 overflow-y-auto space-y-4 pt-2 pr-1">
              {/* Ringkasan file */}
              <div className="p-3 bg-slate-50 dark:bg-[#1e2329] border rounded-xl flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    <span className="truncate max-w-[280px]">{importModalData.fileName}</span>
                  </div>
                  <div className="text-gray-500 text-xs mt-0.5">
                    Header terdeteksi pada Baris ke-{importModalData.headerRowIdx}
                  </div>
                </div>
                <div className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full font-bold text-xs">
                  {importModalData.totalCount} Produk Ditemukan
                </div>
              </div>

              {/* Status Deteksi Harga */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-center">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Produk</div>
                  <div className="text-lg font-bold text-blue-900 dark:text-blue-200 mt-0.5">{importModalData.totalCount}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-lg text-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Harga Normal</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">{importModalData.regCount}</div>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-center">
                  <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">Harga Gold (Member)</div>
                  <div className="text-lg font-bold text-amber-800 dark:text-amber-200 mt-0.5">
                    {importModalData.goldCount} <span className="text-[10px] text-emerald-600 font-bold">✓ Otomatis</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-lg text-center">
                  <div className="text-xs text-purple-700 dark:text-purple-400 font-medium">Harga VIP (Member)</div>
                  <div className="text-lg font-bold text-purple-800 dark:text-purple-200 mt-0.5">
                    {importModalData.vipCount} <span className="text-[10px] text-emerald-600 font-bold">✓ Otomatis</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar jika sedang mengimpor */}
              {isBulkImporting && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> {bulkImportProgress.status}
                    </span>
                    <span>{Math.round((bulkImportProgress.current / (bulkImportProgress.total || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-600 transition-all duration-300"
                      style={{ width: `${(bulkImportProgress.current / (bulkImportProgress.total || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Pratinjau Data Pertama */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Pratinjau Data (5 Produk Pertama):
                </div>
                <div className="border rounded-lg overflow-x-auto text-xs">
                  <table className="w-full border-collapse min-w-[500px]">
                    <thead className="bg-gray-50 dark:bg-[#1e2329] text-gray-700 dark:text-gray-300">
                      <tr>
                        <th className="p-2 text-left font-semibold border-b">Kode</th>
                        <th className="p-2 text-left font-semibold border-b">Nama</th>
                        <th className="p-2 text-left font-semibold border-b">Kategori</th>
                        <th className="p-2 text-right font-semibold border-b">Reguler</th>
                        <th className="p-2 text-right font-semibold border-b text-amber-700 bg-amber-50/50">Gold</th>
                        <th className="p-2 text-right font-semibold border-b text-purple-700 bg-purple-50/50">VIP</th>
                        <th className="p-2 text-center font-semibold border-b">Stok</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importModalData.rows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-b hover:bg-slate-50 dark:hover:bg-[#1e2329]/50">
                          <td className="p-2 font-mono text-[11px] text-gray-600">{row.code || '-'}</td>
                          <td className="p-2 font-semibold text-gray-800 dark:text-gray-200">{row.name}</td>
                          <td className="p-2 text-gray-500">{row.category}</td>
                          <td className="p-2 text-right font-medium">Rp {row.regular.toLocaleString('id-ID')}</td>
                          <td className="p-2 text-right font-bold text-amber-700 dark:text-amber-400 bg-amber-50/30">
                            {row.gold > 0 ? `Rp ${row.gold.toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td className="p-2 text-right font-bold text-purple-700 dark:text-purple-400 bg-purple-50/30">
                            {row.vip > 0 ? `Rp ${row.vip.toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td className="p-2 text-center text-gray-600">{row.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 pt-3 border-t flex flex-col sm:flex-row gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setImportModalData(null)}
              disabled={isBulkImporting}
              className="text-gray-600"
            >
              Simpan di Memori Saja
            </Button>
            <Button 
              type="button" 
              onClick={() => importModalData && handleBulkImportToDatabase(importModalData.rows)} 
              disabled={isBulkImporting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex-1 sm:flex-none justify-center"
            >
              {isBulkImporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Menyinkronkan...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Impor & Sinkronkan Semua ke Database Sekarang
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Sinkronisasi Harga Member untuk Data Eksisting */}
      <Dialog open={isSyncMemberModalOpen} onOpenChange={setIsSyncMemberModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Sinkronisasi Harga Member (Gold & VIP)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-900 dark:text-amber-200">
              <p className="font-semibold mb-1">Status Harga Member di Database:</p>
              <div className="text-xs space-y-1">
                <div>• Total Produk: <span className="font-bold">{products.length}</span></div>
                <div>• Sudah punya Harga Gold: <span className="font-bold text-emerald-700">{products.filter((p: any) => Number(p.price_gold) > 0).length}</span></div>
                <div>• Sudah punya Harga VIP: <span className="font-bold text-emerald-700">{products.filter((p: any) => Number(p.price_vip) > 0).length}</span></div>
                <div>• Belum punya Harga Member: <span className="font-bold text-red-600">{products.filter((p: any) => !p.price_gold || Number(p.price_gold) === 0 || !p.price_vip || Number(p.price_vip) === 0).length}</span></div>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">
              Pilih cara untuk mengisi harga member secara otomatis:
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsSyncMemberModalOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full p-3 border rounded-xl text-left hover:bg-slate-50 dark:hover:bg-[#1e2329] transition-all flex items-start gap-3"
              >
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 rounded-lg shrink-0 mt-0.5">
                  <UploadCloud className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-gray-900 dark:text-gray-100">Upload File Excel Katalog</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Impor kolom Harga Gold dan Harga VIP langsung dari file Excel Anda.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleAutoGenerateMissingMemberPrices}
                disabled={isSyncingMemberPrices}
                className="w-full p-3 border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl text-left hover:bg-amber-100/50 transition-all flex items-start gap-3"
              >
                <div className="p-2 bg-amber-200 dark:bg-amber-900/60 text-amber-800 rounded-lg shrink-0 mt-0.5">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-sm text-amber-900 dark:text-amber-200">
                    {isSyncingMemberPrices ? "Sedang Menghitung & Menyimpan..." : "Hitung Otomatis dari Harga Reguler"}
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    Otomatis atur diskon: Gold diskon 5% & VIP diskon 10% (dibulatkan ke kelipatan 500) untuk semua produk yang masih kosong.
                  </div>
                </div>
              </button>
            </div>
          </div>

          <DialogFooter className="mt-4 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setIsSyncMemberModalOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
