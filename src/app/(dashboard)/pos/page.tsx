"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Search, ShoppingCart, Trash2, CheckCircle2, Plus, DollarSign, UserPlus, Printer, X, Zap, Download, Sparkles, TrendingUp, UserCheck, Heart, Award, History, Clock, ShoppingBag, Eye, User } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { salesService, cashflowService, customersService } from "@/lib/services";
import { useAuth } from "@/components/providers/auth-provider";
import { scopeBranch, friendlyError, unwrap, withBranch, getActiveBranchId, getActiveProfileId } from "@/lib/supabase/db";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import useSWR from "swr";
import { QRCodeSVG } from "qrcode.react";
import { buildDynamicQris } from "@/lib/qris";
import { buildReceiptHtml, printReceipt, printReceiptViaBluetooth, printReceiptViaWebSerial, ReceiptData, PaperWidth } from "@/lib/receipt";

type Product = {
  id: string;
  product_code: string;
  name: string;
  price_regular: number;
  price_gold?: number | null;
  price_vip?: number | null;
  stock_global: number;
  category_id?: string | null;
  sku?: string | null;
};

type CartItem = Product & {
  qty: number;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  customer_level?: string | null;
  points?: number | null;
  total_spend?: number | null;
};

// Helper: Menghitung harga efektif berdasarkan level member pelanggan (REGULER, GOLD, VIP)
const getEffectivePrice = (
  product: { price_regular: number | string; price_gold?: number | string | null; price_vip?: number | string | null },
  customerLevel?: string | null
): { price: number; isMemberPrice: boolean; level: string; regularPrice: number } => {
  const regPrice = Number(product.price_regular || 0);
  const goldPrice = Number(product.price_gold || 0);
  const vipPrice = Number(product.price_vip || 0);
  const level = String(customerLevel || "REGULER").toUpperCase().trim();

  if (level === "VIP" && vipPrice > 0) {
    return { price: vipPrice, isMemberPrice: vipPrice !== regPrice, level: "VIP", regularPrice: regPrice };
  }
  if (level === "GOLD" && goldPrice > 0) {
    return { price: goldPrice, isMemberPrice: goldPrice !== regPrice, level: "GOLD", regularPrice: regPrice };
  }
  if (level !== "REGULER" && level !== "" && level !== "UMUM") {
    if (goldPrice > 0) return { price: goldPrice, isMemberPrice: goldPrice !== regPrice, level: "GOLD", regularPrice: regPrice };
    if (vipPrice > 0) return { price: vipPrice, isMemberPrice: vipPrice !== regPrice, level: "VIP", regularPrice: regPrice };
  }

  return { price: regPrice, isMemberPrice: false, level: "REGULER", regularPrice: regPrice };
};

export default function PosPage() {
  const { activeProfile, activeBranch, role } = useAuth();
  const isOwner = role === 'owner' || activeProfile?.role?.toLowerCase() === 'owner';
  const checkoutKeyRef = useRef<string | null>(null);
  const scannerBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [salesChannel, setSalesChannel] = useState<"Toko" | "WhatsApp" | "Marketplace">("Toko");
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Persist cart to localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('septy_pos_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse saved cart");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('septy_pos_cart', JSON.stringify(cart));
    checkoutKeyRef.current = null;
  }, [cart]);
  
  // Customer selection & Search States
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>("");
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState<boolean>(false);
  const [isCustomerDetailOpen, setIsCustomerDetailOpen] = useState<boolean>(false);
  const [customerDetailTab, setCustomerDetailTab] = useState<'history' | 'products' | 'points'>('history');
  const [newCustLevel, setNewCustLevel] = useState<string>("REGULER");
  
  // Payment states
  const [payTunai, setPayTunai] = useState<number>(0);
  const [payTransfer, setPayTransfer] = useState<number>(0);
  const [payQris, setPayQris] = useState<number>(0);
  const { data: storeInfo = {} as any } = useSWR("store_info_pos", async () => {
    const { data } = await supabase.from("store_settings").select("store_name, address, phone, receipt_footer, qris_raw_data").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    return (data || {}) as any;
  });
  const qrisRaw: string = storeInfo.qris_raw_data || "";
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [paper, setPaper] = useState<PaperWidth>(58);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState(false);
  const [isSerialPrinting, setIsSerialPrinting] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [isKioskModalOpen, setIsKioskModalOpen] = useState(false);

  // Tombol upselling manual: dikontrol langsung oleh kasir (tidak otomatis aktif sendiri)
  const [isUpselling, setIsUpselling] = useState<boolean>(false);
  const totalItemQty = cart.reduce((acc, it) => acc + (it.qty || 1), 0);

  useEffect(() => {
    setAutoPrint(localStorage.getItem("septy_auto_print") === "true");
  }, []);

  const toggleAutoPrint = (val: boolean) => {
    setAutoPrint(val);
    localStorage.setItem("septy_auto_print", String(val));
  };

  const handlePrintReceipt = (customReceipt?: ReceiptData) => {
    const toPrint = customReceipt || receipt;
    if (isPrinting || !toPrint) return;
    setIsPrinting(true);
    printReceipt(toPrint, paper);
    setTimeout(() => setIsPrinting(false), 2000);
  };

  const handlePrintSerial = async (customReceipt?: ReceiptData) => {
    const toPrint = customReceipt || receipt;
    if (isSerialPrinting || !toPrint) return;
    setIsSerialPrinting(true);
    try {
      const res = await printReceiptViaWebSerial(toPrint, paper);
      if (!res.success) {
        alert(res.message);
      }
    } catch (e: any) {
      alert(`Error USB Langsung: ${e.message}`);
    } finally {
      setIsSerialPrinting(false);
    }
  };

  const handlePrintBluetooth = async (customReceipt?: ReceiptData) => {
    const toPrint = customReceipt || receipt;
    if (isBluetoothPrinting || !toPrint) return;
    setIsBluetoothPrinting(true);
    try {
      const res = await printReceiptViaBluetooth(toPrint, paper);
      if (!res.success) {
        alert(res.message);
      }
    } catch (e: any) {
      alert(`Error Bluetooth: ${e.message}`);
    } finally {
      setIsBluetoothPrinting(false);
    }
  };

  const downloadKioskBat = () => {
    const batText = `@echo off\r\necho Membuka Septy POS dalam Mode Langsung Cetak (Kiosk Print)...\r\nstart chrome.exe --kiosk-printing https://septy-pos-app.pages.dev/pos\r\nexit\r\n`;
    const blob = new Blob([batText], { type: "application/x-bat" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Buka-Kasir-Langsung-Cetak.bat";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const saved = localStorage.getItem("septy_paper");
    if (saved === "80") setPaper(80);
    if (saved === "104") setPaper(104);
  }, []);

  const [isProcessing, setIsProcessing] = useState(false);

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseRegisterId, setExpenseRegisterId] = useState("");
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");

  const { data: cashRegisters = [], mutate: fetchCashRegisters } = useSWR('pos_cash_registers', async () => {
    const query = scopeBranch(
      supabase.from('cash_registers').select('id, name, balance, is_expense_fund, store_id, branch_id') as any
    ).eq('is_active', true).order('name');
    const { data } = await query;
    return (data || []) as { id: string; name: string; balance: number; is_expense_fund?: boolean; store_id?: string; branch_id?: string }[];
  });

  useEffect(() => {
    if (!expenseRegisterId && cashRegisters.length > 0) {
      const def = cashRegisters.find((r) => r.is_expense_fund) || cashRegisters[0];
      if (def) setExpenseRegisterId(def.id);
    }
  }, [cashRegisters, expenseRegisterId]);

  const { data: products = [], mutate: fetchProducts } = useSWR('pos_products', async () => {
    const { data } = await scopeBranch(
      supabase.from('products').select('*').is('deleted_at', null)
    ).order('name');
    return data as Product[] || [];
  });

  const { data: customers = [], mutate: fetchCustomers } = useSWR('pos_customers', async () => {
    const { data } = await scopeBranch(
      supabase.from('customers').select('*').is('deleted_at', null)
    ).order('name');
    return data as Customer[] || [];
  });

  const currentCustomer = (customers || []).find((c: any) => c.id === selectedCustomerId);

  // Ambil data transaksi riil pelanggan untuk menampilkan riwayat, produk pernah dibeli, produk favorit, & histori poin
  const { data: customerSales = [], isValidating: loadingHistory } = useSWR(
    selectedCustomerId ? `pos_cust_sales_${selectedCustomerId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id,
          invoice_number,
          receipt_number,
          created_at,
          total_amount,
          status,
          payment_method,
          sale_items (
            id,
            qty,
            price_at_sale,
            products (
              id,
              name,
              product_code
            )
          )
        `)
        .eq('customer_id', selectedCustomerId)
        .order('created_at', { ascending: false });
      if (error) {
        console.warn("Fetch customer sales error:", error);
        return [];
      }
      return data || [];
    }
  );

  // Metrik Analitik Pelanggan
  const calculatedSpend = customerSales.reduce((acc: number, s: any) => acc + Number(s.total_amount || 0), 0);
  const totalCustomerSpend = Math.max(calculatedSpend, Number(currentCustomer?.total_spend || 0));
  const customerTrxCount = customerSales.length;
  const lastCustomerTrx = customerSales.length > 0 && customerSales[0].created_at
    ? new Date(customerSales[0].created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : "Belum ada transaksi";

  // Agregasi Produk Pernah Dibeli & Penentuan Produk Favorit
  const customerProductMap: Record<string, { name: string; code: string; totalQty: number; lastBought: string }> = {};
  for (const sale of customerSales as any[]) {
    for (const it of (sale.sale_items || []) as any[]) {
      const prod = Array.isArray(it.products) ? it.products[0] : it.products;
      const pName = prod?.name || "Produk Softlens";
      const pCode = prod?.product_code || "";
      if (!customerProductMap[pName]) {
        customerProductMap[pName] = { name: pName, code: pCode, totalQty: 0, lastBought: sale.created_at };
      }
      customerProductMap[pName].totalQty += (Number(it.qty) || 1);
    }
  }
  const productsEverBought = Object.values(customerProductMap).sort((a, b) => b.totalQty - a.totalQty);
  const favoriteProduct = productsEverBought.length > 0 ? productsEverBought[0] : null;

  // Total Poin & Riwayat Poin
  const totalCustomerPoints = currentCustomer?.points ?? 0;
  const customerPointsHistory = customerSales.map((s: any) => ({
    id: s.id,
    invoice: s.receipt_number || s.invoice_number,
    date: s.created_at,
    total: Number(s.total_amount || 0),
    earnedPoints: Math.floor(Number(s.total_amount || 0) / 10000)
  }));

  const { data: categories = [] } = useSWR('pos_categories', async () => {
    const { data } = await supabase.from('categories').select('id, name').is('deleted_at', null).order('name');
    return (data || []) as { id: string; name: string }[];
  });

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Sound feedback for scanner and POS actions
  const playBeepSound = (success = true) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (success) {
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // Audio might be blocked until user gesture, safely ignore
    }
  };

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setScanFeedback({ type, text });
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setScanFeedback(null);
    }, 3000);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const priceInfo = getEffectivePrice(product, currentCustomer?.customer_level);
      const priceLabel = priceInfo.isMemberPrice ? ` (Harga Member ${priceInfo.level}: Rp ${priceInfo.price.toLocaleString('id-ID')})` : '';

      if (existing) {
        if (existing.qty >= product.stock_global) {
          playBeepSound(false);
          showFeedback('error', `Stok "${product.name}" tidak mencukupi! (Sisa: ${product.stock_global})`);
          return prev;
        }
        playBeepSound(true);
        showFeedback('success', `+1 ${product.name}${priceLabel} (Total di keranjang: ${existing.qty + 1})`);
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      if (product.stock_global <= 0) {
        playBeepSound(false);
        showFeedback('error', `Stok "${product.name}" habis!`);
        return prev;
      }
      playBeepSound(true);
      showFeedback('success', `✓ "${product.name}"${priceLabel} berhasil ditambahkan ke keranjang`);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQty = (id: string, newQty: number) => {
    if (newQty < 1) return removeFromCart(id);
    const product = products.find(p => p.id === id);
    if (product && newQty > product.stock_global) {
      playBeepSound(false);
      showFeedback('error', `Stok tidak mencukupi! (Maks: ${product.stock_global})`);
      return;
    }
    setCart(prev => prev.map(item => item.id === id ? { ...item, qty: newQty } : item));
  };

  const findProductByBarcode = (scannedCode: string): Product | undefined => {
    const code = scannedCode.trim();
    if (!code) return undefined;

    const lower = code.toLowerCase();
    const cleanAlpha = lower.replace(/[^a-z0-9]/g, '');

    // 1. Exact match on product_code (case-insensitive)
    let found = products.find(p => p.product_code?.trim().toLowerCase() === lower);
    if (found) return found;

    // 2. Alphanumeric match (ignoring dashes, dots, spaces, e.g. "ey-0001" vs "ey0001")
    if (cleanAlpha.length >= 2) {
      found = products.find(p => {
        const pCodeClean = (p.product_code || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        return pCodeClean === cleanAlpha;
      });
      if (found) return found;
    }

    // 3. Match by ID or SKU
    found = products.find(p => p.id === code || (p as any).sku?.trim().toLowerCase() === lower);
    if (found) return found;

    // 4. Match by exact product name
    found = products.find(p => p.name.trim().toLowerCase() === lower);
    return found;
  };

  const findCustomerByBarcode = (scannedCode: string): Customer | undefined => {
    const code = scannedCode.trim().toLowerCase();
    if (!code || code.length < 2) return undefined;
    const cleanDigits = code.replace(/[^0-9]/g, '');

    return (customers || []).find((c: any) => {
      // 1. Cek kecocokan exact ID
      if (c.id && c.id.toLowerCase() === code) return true;
      // 2. Cek nomor HP (exact / substring)
      if (c.phone) {
        const cPhoneClean = c.phone.replace(/[^0-9]/g, '');
        if (cPhoneClean && cleanDigits && (cPhoneClean === cleanDigits || cPhoneClean.endsWith(cleanDigits) || cleanDigits.endsWith(cPhoneClean))) {
          return true;
        }
      }
      // 3. Cek kecocokan nama member
      if (c.name && c.name.trim().toLowerCase() === code) return true;
      return false;
    });
  };

  const processBarcode = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    // 1. Prioritas Scanner: Cek apakah barcode yang discan adalah kartu/identitas member pelanggan
    const matchedCustomer = findCustomerByBarcode(trimmed);
    if (matchedCustomer) {
      setSelectedCustomerId(matchedCustomer.id);
      playBeepSound(true);
      const level = matchedCustomer.customer_level || "REGULER";
      showFeedback('success', `✓ Member Terdeteksi: ${matchedCustomer.name} (${level}) - Harga Member Aktif!`);
      return;
    }

    // 2. Cek produk barang di katalog
    const found = findProductByBarcode(trimmed);
    if (found) {
      addToCart(found);
    } else {
      playBeepSound(false);
      showFeedback('error', `Produk / Member dengan kode "${trimmed}" tidak ditemukan.`);
    }
  };

  // Global barcode scanner listener: captures automatic scans from connected USB/Bluetooth scanners
  // anywhere on the POS page completely automatically without needing any input field!
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Do not intercept modifier keys
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'].includes(e.key)) {
        return;
      }

      // Do not intercept if modal is open
      if (isExpenseModalOpen || isCustomerModalOpen || !!receipt) {
        return;
      }

      const activeEl = document.activeElement;
      const isInput = activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;

      const now = Date.now();
      const elapsed = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Inactivity threshold:
      // If user is typing in another input (like search/name), only rapid scanner typing (< 75ms) is accepted.
      // If user is NOT in any input (body, div, buttons, etc.), allow up to 250ms interval for bluetooth scanners.
      const maxInterval = isInput ? 75 : 250;
      if (elapsed > maxInterval) {
        scannerBufferRef.current = "";
      }

      if (e.key === "Enter") {
        const buffer = scannerBufferRef.current.trim();

        // If buffer has collected a barcode (>= 2 chars)
        if (buffer.length >= 2) {
          e.preventDefault();
          e.stopPropagation();
          scannerBufferRef.current = "";

          // If scanner typed into an input (e.g. search bar), revert that text
          if (isInput && activeEl) {
            const inputEl = activeEl as HTMLInputElement;
            if (inputEl.value && inputEl.value.endsWith(buffer)) {
              inputEl.value = inputEl.value.slice(0, -buffer.length);
              setSearch(prev => prev.endsWith(buffer) ? prev.slice(0, -buffer.length) : prev);
            }
          }

          processBarcode(buffer);
          return;
        }

        scannerBufferRef.current = "";
        return;
      }

      // Buffer single printable characters
      if (e.key.length === 1) {
        scannerBufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, true);
    };
  }, [products, isExpenseModalOpen, isCustomerModalOpen, receipt]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    try {
      const data = await customersService.createCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim() || "-",
        customer_level: newCustLevel,
      });

      if (data?.id) {
        setSelectedCustomerId(data.id);
      }
      setIsCustomerModalOpen(false);
      setNewCustName("");
      setNewCustPhone("");
      setNewCustLevel("REGULER");
      fetchCustomers();
    } catch (err: any) {
      alert(`Gagal menambahkan pelanggan: ${err.message || 'Terjadi kesalahan'}`);
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || !expenseDesc.trim() || isSavingExpense) return;
    const amt = parseFloat(expenseAmount) || 0;
    if (amt <= 0) {
      alert("Nominal pengeluaran harus lebih dari 0.");
      return;
    }

    setIsSavingExpense(true);
    try {
      const branchId = activeBranch?.id || getActiveBranchId();
      const profileId = activeProfile?.id || getActiveProfileId();

      // Tentukan kantong kas target (prioritas: pilihan kasir -> kas pengeluaran kasir -> kas aktif pertama)
      let targetRegId =
        expenseRegisterId ||
        cashRegisters.find((r) => r.is_expense_fund)?.id ||
        cashRegisters[0]?.id ||
        null;

      if (!targetRegId) {
        const { data: fallbackRegs } = await scopeBranch(
          supabase.from("cash_registers").select("id, is_expense_fund") as any
        ).eq("is_active", true);
        const picked = (fallbackRegs || []).find((r: any) => r.is_expense_fund) || (fallbackRegs || [])[0];
        targetRegId = picked?.id || null;
      }

      if (!targetRegId) {
        alert("Belum ada kantong kas aktif. Silakan buat kantong kas terlebih dahulu di menu Buku Kas.");
        return;
      }

      let success = false;
      let lastError: any = null;

      // 1. Catat langsung ke Buku Kas via RPC record_cash_flow (tanpa perlu approval Owner)
      try {
        const res = await supabase.rpc("record_cash_flow", {
          p_payload: {
            branch_id: branchId || undefined,
            cash_register_id: targetRegId,
            flow_type: "OUT",
            category: "PENGELUARAN KASIR",
            amount: amt,
            description: expenseDesc.trim(),
            created_by: profileId || undefined,
          },
        });
        if (!res.error) {
          success = true;
        } else {
          lastError = res.error;
        }
      } catch (rpcErr) {
        lastError = rpcErr;
      }

      // 2. Fallback langsung jika RPC error (kecuali error saldo tidak cukup)
      if (!success) {
        if (lastError?.message && /SALDO_TIDAK_CUKUP/i.test(lastError.message)) {
          throw lastError;
        }
        const { data: reg, error: regErr } = await supabase
          .from("cash_registers")
          .select("id, name, balance, store_id, branch_id")
          .eq("id", targetRegId)
          .single();

        if (regErr || !reg) {
          throw new Error(lastError ? friendlyError(lastError) : "Kantong kas tidak ditemukan.");
        }

        const currentBalance = Number(reg.balance) || 0;
        if (currentBalance < amt) {
          throw new Error(
            `Saldo kas saat ini (Rp ${currentBalance.toLocaleString("id-ID")}) tidak cukup untuk pengeluaran Rp ${amt.toLocaleString("id-ID")}.`
          );
        }

        const { error: updErr } = await supabase
          .from("cash_registers")
          .update({ balance: currentBalance - amt })
          .eq("id", targetRegId);
        if (updErr) throw updErr;

        const flowInsert: any = {
          cash_register_id: targetRegId,
          flow_type: "OUT",
          category: "PENGELUARAN KASIR",
          amount: amt,
          description: expenseDesc.trim(),
          created_by: profileId || null,
        };
        if (branchId || reg.branch_id) flowInsert.branch_id = branchId || reg.branch_id;
        if (reg.store_id) flowInsert.store_id = reg.store_id;

        const { error: insErr } = await supabase.from("cash_flows").insert(flowInsert);
        if (insErr) throw insErr;
      }

      await fetchCashRegisters();
      const targetName = cashRegisters.find((r) => r.id === targetRegId)?.name;
      alert(
        `Pengeluaran sebesar Rp ${amt.toLocaleString("id-ID")} berhasil langsung dicatat ke Buku Kas${targetName ? ` (${targetName})` : ""}!`
      );
      setIsExpenseModalOpen(false);
      setExpenseAmount("");
      setExpenseDesc("");
    } catch (err: any) {
      alert(`Gagal mencatat pengeluaran: ${friendlyError(err)}`);
    } finally {
      setIsSavingExpense(false);
    }
  };

  // Perhitungan Subtotal berbasis Harga Efektif (Harga Member vs Harga Reguler)
  const subtotal = cart.reduce((acc, item) => {
    const eff = getEffectivePrice(item, currentCustomer?.customer_level);
    return acc + (eff.price * item.qty);
  }, 0);
  const subtotalRegular = cart.reduce((acc, item) => acc + (Number(item.price_regular || 0) * item.qty), 0);
  const totalMemberSavings = Math.max(0, subtotalRegular - subtotal);
  const totalAkhir = Math.max(0, subtotal - discount);
  const totalBayar = payTunai + payTransfer + payQris;
  const dynamicQris = qrisRaw && payQris > 0 ? buildDynamicQris(qrisRaw, payQris) : null;

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Keranjang kosong!");
    if (totalBayar < totalAkhir) return alert("Pembayaran kurang!");
    
    setIsProcessing(true);
    try {
      const payments = [];
      if (payTunai > 0) payments.push({ payment_method: 'TUNAI' as const, amount: payTunai });
      if (payTransfer > 0) payments.push({ payment_method: 'TRANSFER' as const, amount: payTransfer });
      if (payQris > 0) payments.push({ payment_method: 'QRIS' as const, amount: payQris });

      // One key per cart: retrying after a timeout returns the same invoice instead of a duplicate sale.
      if (!checkoutKeyRef.current) {
        checkoutKeyRef.current = `POS-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }

      const upsellingNote = isUpselling ? "[UPSELLING]" : "";
      const payload = {
        branch_id: activeBranch?.id,
        customer_id: selectedCustomerId || null,
        cashier_id: activeProfile?.id || null,
        sales_channel: salesChannel,
        discount_amount: discount,
        notes: upsellingNote || undefined,
        idempotency_key: checkoutKeyRef.current,
        items: cart.map(item => {
          const eff = getEffectivePrice(item, currentCustomer?.customer_level);
          return {
            variant_id: item.id,
            qty: item.qty,
            price_at_sale: eff.price
          };
        }),
        payments,
      };

      const result = await salesService.createSale(payload);
      checkoutKeyRef.current = null;

      if (isUpselling && result.sale_id) {
        try {
          await supabase.from("sales").update({ notes: "[UPSELLING]" }).eq("id", result.sale_id);
        } catch (e) {
          console.warn("Update upselling notes error:", e);
        }
      }

      // Siapkan data struk & tampilkan dialog cetak
      const custName = customers.find((c: any) => c.id === selectedCustomerId)?.name || "Umum";
      const payLabels = [
        { label: "Tunai", amount: payTunai },
        { label: "Transfer", amount: payTransfer },
        { label: "QRIS", amount: payQris },
      ].filter((x) => x.amount > 0);

      const realTotal = Number(result.total_amount ?? totalAkhir);
      const calculatedChange = Math.max(0, totalBayar - realTotal);
      const finalChange = calculatedChange > 0 ? calculatedChange : Number(result.change_amount || 0);

      const newReceipt: ReceiptData = {
        storeName: storeInfo.store_name || "Septy Softlens",
        address: storeInfo.address || "",
        phone: storeInfo.phone || "",
        footer: storeInfo.receipt_footer || "",
        branchName: activeBranch?.name || "Pusat",
        cashier: activeProfile?.full_name || "Kasir",
        customer: custName || "",
        invoice: String(result.invoice_number),
        date: new Date().toLocaleString("id-ID"),
        items: cart.map((i) => {
          const eff = getEffectivePrice(i, currentCustomer?.customer_level);
          return {
            name: i.name,
            qty: i.qty,
            price: eff.price
          };
        }),
        subtotal,
        discount,
        total: realTotal,
        payments: payLabels,
        change: finalChange,
      };

      setReceipt(newReceipt);

      // Jika Auto-Print aktif, otomatis langsung cetak struk tanpa perlu tekan tombol lagi
      if (localStorage.getItem("septy_auto_print") === "true") {
        setTimeout(() => {
          handlePrintReceipt(newReceipt);
        }, 250);
      }

      setCart([]);
      setDiscount(0);
      setPayTunai(0);
      setPayTransfer(0);
      setPayQris(0);
      setSelectedCustomerId("");
      setIsUpselling(false);
      fetchProducts();

    } catch (err: any) {
      console.error(err);
      alert(`Gagal memproses transaksi: ${friendlyError(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || 
      p.name.toLowerCase().includes(q) || 
      p.product_code.toLowerCase().includes(q);
    const matchesCategory = selectedCategory === "ALL" || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col md:flex-row gap-4 max-w-full pb-10">
      {/* Left Area (Product List) */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-normal">Mesin Kasir (POS)</h1>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-0.5">Klik produk untuk menambah ke keranjang.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button 
              onClick={() => setIsExpenseModalOpen(true)}
              variant="outline" 
              className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 font-bold rounded-xl whitespace-nowrap text-xs sm:text-sm h-10 px-3 sm:px-4"
            >
              + Catat Pengeluaran
            </Button>
          </div>
        </div>

        {/* Notifikasi feedback hasil scan barcode */}
        {scanFeedback && (
          <div 
            className={`p-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-all duration-300 shadow-sm ${
              scanFeedback.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
                : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {scanFeedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <span className="text-red-500 font-bold shrink-0">⚠️</span>
              )}
              <span>{scanFeedback.text}</span>
            </div>
            <button 
              type="button"
              onClick={() => setScanFeedback(null)} 
              className="text-xs opacity-60 hover:opacity-100 px-2 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search filter bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau kode produk..." 
            className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
          />
          {search && (
            <button 
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Kategori Filter Tabs */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                selectedCategory === "ALL"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "bg-white dark:bg-[#13151a] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1a1d24]"
              }`}
            >
              Semua ({products.length})
            </button>
            {categories.map((cat: any) => {
              const count = products.filter(p => p.category_id === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                      : "bg-white dark:bg-[#13151a] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1a1d24]"
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        )}
        
        {/* Products Grid (Persis 100% seperti gambar referensi pengguna) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredProducts.map(product => {
            const inCart = cart.find(c => c.id === product.id);
            const cartQty = inCart?.qty || 0;
            const isOutOfStock = product.stock_global <= 0;

            return (
              <div 
                key={product.id} 
                onClick={() => addToCart(product)}
                className={`bg-white dark:bg-[#13151a] border border-gray-100 dark:border-gray-800 rounded-xl p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all flex flex-col justify-between min-h-[125px] select-none active:scale-[0.98] ${
                  cartQty > 0 ? 'ring-2 ring-blue-500/20 border-blue-500' : ''
                }`}
              >
                <div>
                  {/* Top row: Code on Left, Stock Pill on Right */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate">
                        {product.product_code}
                      </span>
                      {cartQty > 0 && (
                        <span className="bg-blue-600 text-white font-bold text-[10px] px-1.5 py-0.2 rounded-full shadow-2xs shrink-0">
                          {cartQty}x
                        </span>
                      )}
                    </div>
                    {isOutOfStock ? (
                      <span className="text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 px-2.5 py-0.5 rounded-full uppercase tracking-wide shrink-0">
                        HABIS
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-0.5 rounded-full uppercase tracking-wide shrink-0">
                        STOK: {product.stock_global}
                      </span>
                    )}
                  </div>

                  {/* Middle: Product Name */}
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mt-2 mb-4 line-clamp-1">
                    {product.name}
                  </h3>
                </div>

                {/* Bottom row: Price (Harga Member otomatis jika member aktif) */}
                <div>
                  {(() => {
                    const priceInfo = getEffectivePrice(product, currentCustomer?.customer_level);
                    if (priceInfo.isMemberPrice) {
                      return (
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base sm:text-lg">
                            Rp {priceInfo.price.toLocaleString('id-ID')}
                          </span>
                          <span className="line-through text-xs text-gray-400">
                            Rp {priceInfo.regularPrice.toLocaleString('id-ID')}
                          </span>
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                            priceInfo.level === 'VIP' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                            'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {priceInfo.level}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <span className="font-bold text-gray-900 dark:text-gray-100 text-base sm:text-lg">
                        Rp {priceInfo.price.toLocaleString('id-ID')}
                      </span>
                    );
                  })()}
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-400 bg-white dark:bg-[#13151a] rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
              Tidak ada produk ditemukan.
              {(search || selectedCategory !== "ALL") && (
                <div className="mt-2">
                  <button 
                    type="button" 
                    onClick={() => { setSearch(""); setSelectedCategory("ALL"); }}
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    Reset Filter
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Area (Cart) */}
      <div className="w-full md:w-[320px] lg:w-[360px] xl:w-[390px] shrink-0">
        <div className="bg-[#f8fafc] dark:bg-[#0f1115] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-y-auto flex flex-col max-h-[calc(100vh-2rem)] md:h-[calc(100vh-6rem)] sticky top-4 md:top-6">
          {/* Cart Header */}
          <div className="shrink-0 px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#13151a] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base">Keranjang Belanja</h2>
            </div>
            <div className="bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
              {cart.reduce((a, b) => a + b.qty, 0)} item
            </div>
          </div>

          {/* Cart Items Area (scrollable, always keeps a readable minimum height) */}
          <div className="flex-1 min-h-[150px] overflow-y-auto px-4 py-3 bg-white dark:bg-[#13151a] divide-y divide-gray-100 dark:divide-gray-800/60">
            {cart.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[120px]">
                <p className="text-gray-400 font-medium text-sm">Belum ada barang di keranjang</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 break-words">{item.name}</p>
                    {(() => {
                      const priceInfo = getEffectivePrice(item, currentCustomer?.customer_level);
                      if (priceInfo.isMemberPrice) {
                        return (
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              Rp {priceInfo.price.toLocaleString("id-ID")}
                            </span>
                            <span className="text-[11px] text-gray-400 line-through">
                              Rp {priceInfo.regularPrice.toLocaleString("id-ID")}
                            </span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                              priceInfo.level === 'VIP' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                              'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {priceInfo.level}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                          Rp {priceInfo.price.toLocaleString("id-ID")}
                        </p>
                      );
                    })()}
                  </div>
                  <div className="shrink-0 flex items-center gap-1 bg-gray-50 dark:bg-[#1e2329] rounded-lg p-1 border border-gray-100 dark:border-gray-800/50">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-6 h-6 flex items-center justify-center bg-white dark:bg-[#13151a] rounded shadow-sm text-gray-600 dark:text-gray-400 font-bold">-</button>
                    <span className="w-7 text-center text-xs font-bold">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-6 h-6 flex items-center justify-center bg-white dark:bg-[#13151a] rounded shadow-sm text-gray-600 dark:text-gray-400 font-bold">+</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary & Actions (compact, never shrinks) */}
          <div className="shrink-0 bg-[#f8fafc] dark:bg-[#0f1115] border-t border-gray-200 dark:border-gray-800 px-5 py-4 space-y-3">
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-sm font-medium text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">Rp {subtotal.toLocaleString("id-ID")}</span>
              </div>
              {totalMemberSavings > 0 && (
                <div className="flex justify-between items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Potongan Member ({currentCustomer?.customer_level}):
                  </span>
                  <span>- Rp {totalMemberSavings.toLocaleString("id-ID")}</span>
                </div>
              )}

              {/* Kolom Potongan Harga yang bisa diinput langsung oleh kasir */}
              <div className="p-2.5 bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-xl space-y-2 shadow-2xs">
                <div className="flex justify-between items-center">
                  <label htmlFor="discount-input" className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <span>Potongan Harga</span>
                    {discount > 0 && (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded">
                        - Rp {discount.toLocaleString("id-ID")}
                      </span>
                    )}
                  </label>
                  {discount > 0 && (
                    <button
                      type="button"
                      onClick={() => setDiscount(0)}
                      className="text-[11px] text-gray-400 hover:text-red-500 font-semibold"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-gray-400 select-none">Rp</span>
                  <input
                    id="discount-input"
                    type="number"
                    min="0"
                    max={subtotal}
                    value={discount === 0 ? "" : discount}
                    onChange={(e) => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                      setDiscount(val);
                    }}
                    placeholder="0 (masukkan potongan harga)"
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-[#1e2329]"
                  />
                </div>

                {/* Shortcut pilihan cepat potongan harga */}
                <div className="flex gap-1.5 overflow-x-auto pt-0.5">
                  {[5000, 10000, 15000, 20000, 50000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDiscount(preset)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors shrink-0 ${
                        discount === preset
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-gray-50 dark:bg-[#1e2329] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-[#252b33]"
                      }`}
                    >
                      {preset >= 1000 ? `${preset / 1000}rb` : preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center text-base font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-gray-200 dark:border-gray-800">
                <span>Total Akhir</span>
                <span className="text-lg text-slate-900 dark:text-white font-mono">
                  Rp {totalAkhir.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Tombol & Indikator Upselling Kasir */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setIsUpselling(prev => !prev)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border font-bold text-xs transition-all duration-300 ${
                  isUpselling
                    ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-400 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/50"
                    : "bg-white dark:bg-[#13151a] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                }`}
                title="Klik untuk mengaktifkan atau menonaktifkan status upselling kasir."
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                    isUpselling 
                      ? "bg-white/25 text-white shadow-inner animate-pulse" 
                      : "bg-gray-100 dark:bg-[#1e2329] text-gray-400"
                  }`}>
                    <Sparkles className={`h-4 w-4 ${isUpselling ? "fill-amber-300 text-amber-300" : ""}`} />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs tracking-tight">Upselling Kasir</span>
                      {isUpselling ? (
                        <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                          <TrendingUp className="h-2.5 w-2.5" /> MENYALA
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-semibold">
                          (Non-Aktif)
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] font-medium leading-tight ${isUpselling ? "text-emerald-100" : "text-gray-400"}`}>
                      {isUpselling 
                        ? `✨ Status Upselling Aktif (${totalItemQty} item)` 
                        : "Klik untuk mengaktifkan upselling manual"}
                    </p>
                  </div>
                </div>

                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 flex items-center shrink-0 ${
                  isUpselling ? "bg-white" : "bg-gray-300 dark:bg-gray-700"
                }`}>
                  <div className={`w-4 h-4 rounded-full transition-transform duration-200 shadow-sm ${
                    isUpselling ? "bg-emerald-600 translate-x-4" : "bg-white translate-x-0"
                  }`} />
                </div>
              </button>
            </div>

<div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                  <span>Pelanggan / Member</span>
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">(Opsional)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1"
                >
                  <UserPlus className="h-3.5 w-3.5" /> + Pelanggan Baru
                </button>
              </div>

              {/* JIKA BELUM ADA PELANGGAN TERPILIH: Kolom Pencarian Cerdas (Nama / No WA / Scan Barcode) */}
              {!currentCustomer ? (
                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="h-4 w-4 absolute left-3 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setIsCustomerSearchOpen(true);
                      }}
                      onFocus={() => setIsCustomerSearchOpen(true)}
                      placeholder="Ketik Nama atau No. WA / Scan Barcode..."
                      className="w-full pl-9 pr-8 py-2.5 bg-white dark:bg-[#13151a] border-2 border-dashed border-blue-400/80 dark:border-blue-600/80 rounded-xl text-xs font-semibold placeholder:text-gray-400 focus:outline-none focus:border-blue-600 focus:border-solid focus:ring-2 focus:ring-blue-500/20"
                    />
                    {customerSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerSearchQuery("");
                          setIsCustomerSearchOpen(false);
                        }}
                        className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Hasil Pencarian Pelanggan */}
                  {isCustomerSearchOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-[#1a1f26] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl divide-y divide-gray-100 dark:divide-gray-800">
                      {customers.filter((c: any) => {
                        if (!customerSearchQuery.trim()) return true;
                        const q = customerSearchQuery.toLowerCase().trim();
                        const matchName = (c.name || "").toLowerCase().includes(q);
                        const matchPhone = (c.phone || "").replace(/[^0-9]/g, "").includes(q.replace(/[^0-9]/g, ""));
                        return matchName || matchPhone;
                      }).length === 0 ? (
                        <div className="p-3 text-center text-xs text-gray-400">
                          Pelanggan tidak ditemukan.
                          <div className="mt-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomerSearchOpen(false);
                                setIsCustomerModalOpen(true);
                              }}
                              className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              <UserPlus className="h-3 w-3" /> Daftarkan Sekarang
                            </button>
                          </div>
                        </div>
                      ) : (
                        customers.filter((c: any) => {
                          if (!customerSearchQuery.trim()) return true;
                          const q = customerSearchQuery.toLowerCase().trim();
                          const matchName = (c.name || "").toLowerCase().includes(q);
                          const matchPhone = (c.phone || "").replace(/[^0-9]/g, "").includes(q.replace(/[^0-9]/g, ""));
                          return matchName || matchPhone;
                        }).map((c: any) => {
                          const level = (c.customer_level || "REGULER").toUpperCase();
                          const levelColor =
                            level === "VIP"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                              : level === "GOLD"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomerId(c.id);
                                setIsCustomerSearchOpen(false);
                                setCustomerSearchQuery("");
                                playBeepSound(true);
                                showFeedback('success', `✓ Pelanggan: ${c.name} (${level}) terpilih`);
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center justify-between transition-colors"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">{c.phone || "No WA belum diisi"}</p>
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${levelColor}`}>
                                  {level}
                                </span>
                                <span className="text-[10px] text-gray-500 font-semibold flex items-center gap-0.5">
                                  <Award className="h-3 w-3 text-amber-500" /> {c.points || 0}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* KARTU PROFIL & INSIGHT PELANGGAN SAAT PELANGGAN DITEMUKAN */
                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-[#171a21] dark:to-[#13151a] border border-blue-200 dark:border-blue-900/60 rounded-xl p-3 shadow-xs space-y-2.5">
                  {/* Header: Nama, No WA, Badge Level, & Tombol Ganti */}
                  <div className="flex items-start justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">
                          {currentCustomer.name}
                        </h4>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        WA: {currentCustomer.phone || "-"}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase shadow-2xs ${
                        (currentCustomer.customer_level || "REGULER") === 'VIP'
                          ? 'bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-950 dark:text-purple-300'
                          : (currentCustomer.customer_level || "REGULER") === 'GOLD'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        ★ {currentCustomer.customer_level || "REGULER"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId("");
                          setCustomerSearchQuery("");
                        }}
                        title="Ganti Pelanggan"
                        className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#1e2329]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Grid 4 Metrik: Total Pembelian, Frekuensi, Terakhir Transaksi, & Poin */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-white dark:bg-[#1e2329] p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] text-gray-400 font-semibold block">Total Pembelian:</span>
                      <span className="font-extrabold text-gray-900 dark:text-gray-100">
                        Rp {totalCustomerSpend.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-[#1e2329] p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] text-gray-400 font-semibold block">Frekuensi Transaksi:</span>
                      <span className="font-extrabold text-blue-600 dark:text-blue-400">
                        {customerTrxCount}x Belanja
                      </span>
                    </div>
                    <div className="bg-white dark:bg-[#1e2329] p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] text-gray-400 font-semibold block">Terakhir Transaksi:</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300 text-[10px] line-clamp-1" title={lastCustomerTrx}>
                        {lastCustomerTrx}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-[#1e2329] p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] text-gray-400 font-semibold block">Total Poin Loyalitas:</span>
                      <span className="font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                        {totalCustomerPoints} Poin
                      </span>
                    </div>
                  </div>

                  {/* Produk Favorit */}
                  {favoriteProduct && (
                    <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 p-2 rounded-lg text-[11px] flex items-center gap-1.5 text-rose-900 dark:text-rose-200 font-medium">
                      <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 shrink-0" />
                      <span className="truncate">
                        <strong>Favorit:</strong> {favoriteProduct.name} ({favoriteProduct.totalQty}x dibeli)
                      </span>
                    </div>
                  )}

                  {/* Tombol Lihat Riwayat Transaksi & Produk Pernah Dibeli */}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerDetailTab('history');
                      setIsCustomerDetailOpen(true);
                    }}
                    className="w-full text-center py-1.5 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <History className="h-3.5 w-3.5" />
                    Lihat Riwayat & Produk Pernah Dibeli ({customerTrxCount})
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Channel Penjualan</label>
              <div className="flex bg-gray-200 dark:bg-[#1e2329] rounded-lg p-1 gap-1">
                {(["Toko", "WhatsApp", "Marketplace"] as const).map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => setSalesChannel(channel)}
                    className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all whitespace-nowrap ${
                      salesChannel === channel
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-transparent text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-[#13151a]"
                    }`}
                  >
                    {channel}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Pembayaran (Split)</label>
              <div className="bg-white dark:bg-[#13151a] border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2.5 space-y-2">
                {([
                  { label: "Tunai", value: payTunai, set: setPayTunai },
                  { label: "Transfer", value: payTransfer, set: setPayTransfer },
                  { label: "QRIS", value: payQris, set: setPayQris },
                ] as const).map(row => (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 w-16 shrink-0">{row.label}</span>
                    <div className="relative flex-1 min-w-0">
                      <input
                        type="number"
                        value={row.value || ""}
                        onChange={e => row.set(Number(e.target.value))}
                        onFocus={() => {
                          if (row.label === "QRIS" && payQris === 0) {
                            const remaining = totalAkhir - payTunai - payTransfer;
                            if (remaining > 0) setPayQris(remaining);
                          }
                        }}
                        className="w-full pl-3 pr-8 py-1.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-md text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold pointer-events-none">Rp</span>
                    </div>
                  </div>
                ))}

                {payQris > 0 && (
                  <div className="flex flex-col items-center gap-2 p-3 rounded-lg border border-dashed border-blue-300 bg-blue-50/50 dark:bg-blue-900/10">
                    {dynamicQris ? (
                      <>
                        <div className="bg-white p-2 rounded-lg">
                          <QRCodeSVG value={dynamicQris} size={180} level="M" />
                        </div>
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Scan untuk bayar QRIS</p>
                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">Rp {payQris.toLocaleString("id-ID")}</p>
                      </>
                    ) : (
                      <p className="text-xs text-red-500 font-semibold text-center">
                        QRIS toko belum diatur. Owner: isi data QRIS di menu Pengaturan.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800/50">
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Total Bayar:</span>
                  <span className={`text-sm font-semibold ${totalBayar >= totalAkhir ? 'text-[#00a84e]' : 'text-red-500'}`}>
                    Rp {totalBayar.toLocaleString()}
                  </span>
                </div>
                {totalBayar > totalAkhir && (
                  <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400">
                    <span>Kembalian:</span>
                    <span>Rp {(totalBayar - totalAkhir).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleCheckout}
              disabled={isProcessing || cart.length === 0 || totalBayar < totalAkhir}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-sm text-sm"
            >
              {isProcessing ? "Memproses..." : "Selesaikan Transaksi"}
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Struk Setelah Pembayaran */}
      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="w-[95vw] sm:max-w-[460px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-4">
              <DialogTitle className="flex items-center gap-2 text-emerald-600 text-base">
                <CheckCircle2 className="h-5 w-5 shrink-0" /> Pembayaran Berhasil
              </DialogTitle>
              <button
                type="button"
                onClick={() => setIsKioskModalOpen(true)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 px-2 py-1 rounded-md border border-blue-200 dark:border-blue-900 shrink-0"
              >
                <Zap className="h-3 w-3 text-amber-500 fill-amber-500" /> Mode Langsung Cetak
              </button>
            </div>
          </DialogHeader>
          {receipt && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold gap-2 bg-gray-50 dark:bg-[#1a1f26] p-2 rounded-lg">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">Kertas:</span>
                  {([58, 80, 104] as const).map((w) => (
                    <button
                      key={w}
                      onClick={() => { setPaper(w); localStorage.setItem("septy_paper", String(w)); }}
                      className={`px-2 py-0.5 rounded border text-xs ${paper === w ? "bg-slate-900 text-white border-slate-900" : "bg-white dark:bg-[#1e2329] text-gray-600 border-gray-200 dark:border-gray-800"}`}
                    >
                      {w}mm
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={autoPrint}
                    onChange={(e) => toggleAutoPrint(e.target.checked)}
                    className="rounded border-gray-300 text-slate-900 focus:ring-slate-900 h-3.5 w-3.5"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Auto Print</span>
                </label>
              </div>

              <div className="bg-gray-100 dark:bg-[#0f1115] rounded-lg p-2 overflow-auto">
                <iframe
                  id="preview-receipt-iframe"
                  title="Preview Struk"
                  srcDoc={buildReceiptHtml(receipt, paper)}
                  className="bg-white mx-auto block rounded shadow-sm w-full"
                  style={{ maxWidth: paper === 58 ? 260 : paper === 80 ? 340 : 420, height: 350, border: 0 }}
                />
              </div>

              {/* Panduan Cetak di Device Baru */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-3 text-xs space-y-1 text-amber-900 dark:text-amber-200">
                <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-100">
                  <Zap className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                  Tips Agar Kertas Tidak Keluar Panjang di Komputer/Device Baru:
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                  Gunakan tombol <strong>Cetak Bluetooth</strong> atau <strong>Cetak USB Langsung</strong> agar kertas otomatis pas dan langsung berhenti di semua device tanpa perlu setting apa pun!
                </p>
                <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                  Jika pakai <strong>Dialog Chrome (USB)</strong>: Pastikan ganti <em>Paper size</em> dari <span className="underline font-bold">3276 mm</span> ke ukuran pendek, dan <strong>hilangkan centang Headers & Footers</strong>.
                </p>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button 
                    disabled={isBluetoothPrinting}
                    variant="outline"
                    className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 font-bold text-xs py-2" 
                    onClick={() => handlePrintBluetooth()}
                  >
                    <Printer className="h-4 w-4 mr-1.5 text-blue-600" /> {isBluetoothPrinting ? "Menghubungkan..." : "1. Cetak Bluetooth (Nirkabel)"}
                  </Button>
                  <Button 
                    disabled={isSerialPrinting}
                    variant="outline"
                    className="border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-bold text-xs py-2" 
                    onClick={() => handlePrintSerial()}
                  >
                    <Printer className="h-4 w-4 mr-1.5 text-emerald-600" /> {isSerialPrinting ? "Mencetak..." : "2. Cetak USB Langsung (ESC/POS)"}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="w-24 text-xs font-semibold" onClick={() => setReceipt(null)}>Tutup</Button>
                  <Button 
                    disabled={isPrinting}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2" 
                    onClick={() => handlePrintReceipt()}
                  >
                    <Printer className="h-4 w-4 mr-1.5" /> {isPrinting ? "Membuka Dialog..." : "3. Cetak Dialog Chrome (USB)"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Panduan Mode Langsung Cetak (Kiosk Mode) */}
      <Dialog open={isKioskModalOpen} onOpenChange={setIsKioskModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Zap className="h-5 w-5 text-amber-500 fill-amber-500" /> Cara Langsung Cetak Tanpa Dialog
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 text-xs text-gray-600 dark:text-gray-300 pt-2 leading-relaxed">
            <p>
              Dengan <strong>Mode Langsung Cetak (Kiosk Printing)</strong>, saat Anda klik tombol <strong>Cetak Struk</strong>, printer kasir akan <strong>langsung mengeluarkan kertas struk</strong> tanpa memunculkan jendela dialog Chrome dan tanpa perlu klik konfirmasi lagi!
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl space-y-2">
              <div className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                <Download className="h-4 w-4" /> Cara 1 (Paling Cepat &amp; Otomatis):
              </div>
              <p className="text-amber-800 dark:text-amber-300 text-[11.5px]">
                Download file pintasan kasir di bawah ini, lalu simpan di <strong>Desktop</strong> laptop kasir:
              </p>
              <Button
                type="button"
                onClick={downloadKioskBat}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold h-9 text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="h-4 w-4" /> Download Pintasan Kasir (.bat)
              </Button>
              <ol className="list-decimal list-inside space-y-1 text-amber-900 dark:text-amber-200 text-[11px] pt-1">
                <li>Tutup semua jendela Google Chrome yang sedang terbuka.</li>
                <li>Buka kasir dengan <strong>klik ganda file .bat yang baru didownload</strong> di Desktop.</li>
                <li>Sekarang setiap kali klik &quot;Cetak Struk&quot;, struk <strong>langsung terprint otomatis</strong>!</li>
              </ol>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-[#1a1f26] border border-gray-200 dark:border-gray-800 rounded-xl space-y-1.5">
              <div className="font-bold text-gray-900 dark:text-gray-100 text-xs">
                Cara 2 (Ubah Shortcut Google Chrome Manual):
              </div>
              <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400 text-[11px]">
                <li>Klik kanan ikon <strong>Google Chrome</strong> di Desktop &rarr; pilih <strong>Properties</strong>.</li>
                <li>Pada kolom <strong>Target</strong>, tambahkan spasi di ujung teks lalu ketik: <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-[10px] font-mono">--kiosk-printing</code></li>
                <li>Klik <strong>Apply</strong> &rarr; <strong>OK</strong>.</li>
              </ol>
            </div>

            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-[11px] text-blue-900 dark:text-blue-200">
              💡 <strong>Tips Tambahan:</strong> Pastikan printer kasir Anda sudah dijadikan <em>Default Printer</em> di Windows (Settings &rarr; Printers &rarr; Set as default), dan di jendela cetak set Margin ke <em>None (Tanpa margin)</em>.
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button type="button" onClick={() => setIsKioskModalOpen(false)} className="w-full bg-slate-900 text-white font-bold">
                Mengerti &amp; Tutup
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal Catat Pengeluaran */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Catat Pengeluaran Kasir</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecordExpense} className="space-y-4 pt-3">
            {cashRegisters.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Sumber Kantong Kas</label>
                <select
                  value={expenseRegisterId}
                  onChange={(e) => setExpenseRegisterId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  required
                >
                  {cashRegisters.map((reg) => (
                    <option key={reg.id} value={reg.id}>
                      {reg.name} {reg.is_expense_fund ? "(Kas Pengeluaran)" : ""} — Saldo: Rp {Number(reg.balance || 0).toLocaleString("id-ID")}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Nominal (Rp)</label>
              <input
                type="number"
                min="1"
                placeholder="Contoh: 50000"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Keterangan / Keperluan</label>
              <input
                type="text"
                placeholder="Contoh: Beli bensin kurir / galon air"
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg px-3 py-2">
              Pengeluaran akan langsung dicatat ke Buku Kas &amp; memotong saldo kas tanpa memerlukan approval Owner.
            </p>
            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsExpenseModalOpen(false)} disabled={isSavingExpense}>
                Batal
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold" disabled={isSavingExpense}>
                {isSavingExpense ? "Menyimpan..." : "Simpan Pengeluaran"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Tambah Pelanggan Cepat */}
      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" /> Daftarkan Pelanggan Baru
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCustomer} className="space-y-4 pt-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Nama pelanggan..."
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Nomor WhatsApp <span className="text-gray-400 font-normal">(Dapat digunakan kasir untuk pencarian)</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: 081234567890"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Tingkat Member {!isOwner && <span className="text-[10px] text-amber-600 font-normal">(Khusus Owner)</span>}
              </label>
              {isOwner ? (
                <select
                  value={newCustLevel}
                  onChange={(e) => setNewCustLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#1e2329] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                >
                  <option value="REGULER">Reguler (Standar Member Baru)</option>
                  <option value="GOLD">Gold (Harga Grosir / Reseller)</option>
                  <option value="VIP">VIP (Harga Khusus VIP)</option>
                </select>
              ) : (
                <div>
                  <input
                    disabled
                    type="text"
                    value="Reguler (Otomatis Member Baru)"
                    className="w-full px-3.5 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-600 dark:text-gray-400 font-semibold cursor-not-allowed"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Member baru otomatis berstatus Reguler. Perubahan level hanya dapat dilakukan oleh Owner.
                  </p>
                </div>
              )}
            </div>

            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-800 dark:text-blue-300">
              ℹ️ Membership Septy Softlens tidak memiliki batas waktu (Aktif Permanen).
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsCustomerModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold">
                Daftarkan Pelanggan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL LENGKAP DETAIL RIWAYAT TRANSAKSI, PRODUK PERNAH DIBELI, & HISTORI POIN */}
      <Dialog open={isCustomerDetailOpen} onOpenChange={setIsCustomerDetailOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-600" /> Profil & Riwayat Pelanggan
              </span>
              {currentCustomer && (
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase ${
                  (currentCustomer.customer_level || "REGULER") === 'VIP'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                    : (currentCustomer.customer_level || "REGULER") === 'GOLD'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                  {currentCustomer.customer_level || "REGULER"}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {currentCustomer && (
            <div className="space-y-4 pt-1 text-sm">
              {/* Ringkasan Profil Singkat */}
              <div className="p-3.5 bg-gray-50 dark:bg-[#1a1f26] rounded-xl border border-gray-200 dark:border-gray-800 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">{currentCustomer.name}</h3>
                    <p className="text-xs text-gray-500">No. WhatsApp: {currentCustomer.phone || "-"}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block font-semibold">Total Poin Reward:</span>
                    <span className="font-extrabold text-amber-600 text-base flex items-center justify-end gap-1">
                      <Award className="h-4 w-4 fill-amber-400" /> {totalCustomerPoints} Poin
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Total Pembelian</span>
                    <span className="font-extrabold text-gray-900 dark:text-gray-100">
                      Rp {totalCustomerSpend.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Frekuensi Transaksi</span>
                    <span className="font-extrabold text-blue-600">
                      {customerTrxCount}x Belanja
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Terakhir Belanja</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300 text-[10px] line-clamp-1" title={lastCustomerTrx}>
                      {lastCustomerTrx}
                    </span>
                  </div>
                </div>

                {favoriteProduct && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-1.5">
                    <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 shrink-0" />
                    <span><strong>Produk Terfavorit:</strong> {favoriteProduct.name} (Total {favoriteProduct.totalQty}x dibeli)</span>
                  </div>
                )}
              </div>

              {/* Tab Navigasi Modal */}
              <div className="flex border-b border-gray-200 dark:border-gray-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCustomerDetailTab('history')}
                  className={`flex-1 py-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                    customerDetailTab === 'history'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <History className="h-3.5 w-3.5" /> Riwayat Transaksi ({customerTrxCount})
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerDetailTab('products')}
                  className={`flex-1 py-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                    customerDetailTab === 'products'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <ShoppingBag className="h-3.5 w-3.5" /> Produk Pernah Dibeli ({productsEverBought.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerDetailTab('points')}
                  className={`flex-1 py-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                    customerDetailTab === 'points'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Award className="h-3.5 w-3.5" /> Histori Poin
                </button>
              </div>

              {/* Konten Tab 1: Riwayat Transaksi */}
              {customerDetailTab === 'history' && (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {customerSales.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      Belum ada riwayat transaksi penjualan sebelumnya.
                    </div>
                  ) : (
                    customerSales.map((s: any) => (
                      <div key={s.id} className="p-2.5 bg-white dark:bg-[#1a1f26] border border-gray-200 dark:border-gray-800 rounded-xl text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-gray-100">{s.receipt_number || s.invoice_number}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {new Date(s.created_at).toLocaleString("id-ID", { dateStyle: 'medium', timeStyle: 'short' })} • {s.payment_method || "TUNAI"}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 block">
                            Rp {Number(s.total_amount || 0).toLocaleString("id-ID")}
                          </span>
                          <span className="text-[10px] bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 font-semibold px-2 py-0.2 rounded-full">
                            {s.status || "COMPLETED"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Konten Tab 2: Produk yang Pernah Dibeli */}
              {customerDetailTab === 'products' && (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {productsEverBought.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      Belum ada daftar produk yang pernah dibeli.
                    </div>
                  ) : (
                    productsEverBought.map((p, idx) => (
                      <div key={idx} className="p-2.5 bg-white dark:bg-[#1a1f26] border border-gray-200 dark:border-gray-800 rounded-xl text-xs flex justify-between items-center">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Kode: {p.code || "-"}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg">
                            Total: {p.totalQty} pcs
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Konten Tab 3: Histori Poin */}
              {customerDetailTab === 'points' && (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs flex justify-between items-center">
                    <span className="font-bold text-amber-900 dark:text-amber-200">Saldo Poin Saat Ini:</span>
                    <span className="font-extrabold text-base text-amber-600">{totalCustomerPoints} Poin</span>
                  </div>
                  {customerPointsHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      Belum ada histori transaksi untuk perhitungan poin.
                    </div>
                  ) : (
                    customerPointsHistory.map((ph: any) => (
                      <div key={ph.id} className="p-2.5 bg-white dark:bg-[#1a1f26] border border-gray-200 dark:border-gray-800 rounded-xl text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-gray-100">{ph.invoice}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {new Date(ph.date).toLocaleDateString("id-ID", { dateStyle: 'medium' })} • Belanja Rp {ph.total.toLocaleString("id-ID")}
                          </p>
                        </div>
                        <span className="font-extrabold text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-md">
                          +{ph.earnedPoints} Poin
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              <DialogFooter className="pt-2 border-t">
                <Button type="button" onClick={() => setIsCustomerDetailOpen(false)} className="w-full bg-slate-900 text-white font-bold text-xs">
                  Tutup
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}



