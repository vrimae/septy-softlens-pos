// ==============================================================================
// FILE: src/lib/supabase/db.ts
// Central data-access guards used by every page/service.
//
// Why this exists:
//   supabase-js never throws on failed writes; it returns { error }. Pages that did
//   `await supabase.from(x).insert(...)` without reading `error` closed the modal as
//   if the save succeeded, and the row was simply missing after a refresh.
//   `unwrap()` turns every failure into a thrown Error so the UI can show it.
//
//   Branch isolation is applied here too, so every list query and insert is scoped
//   to the branch selected in the sidebar (persisted in localStorage).
// ==============================================================================

const BRANCH_KEY = "septy_active_branch";
const PROFILE_KEY = "septy_active_profile";

export function getActiveBranchId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BRANCH_KEY);
    return raw ? (JSON.parse(raw)?.id ?? null) : null;
  } catch {
    return null;
  }
}

export function getActiveProfileId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw)?.id ?? null) : null;
  } catch {
    return null;
  }
}

/** Adds the active branch_id to a row (or rows) before insert. */
export function withBranch<T extends Record<string, any>>(row: T): T & { branch_id?: string } {
  const branchId = getActiveBranchId();
  return branchId ? { ...row, branch_id: branchId } : row;
}

/** Restricts a select/update/delete query to the active branch. */
export function scopeBranch<Q extends { eq: (col: string, val: any) => Q }>(query: Q): Q {
  const branchId = getActiveBranchId();
  return branchId ? query.eq("branch_id", branchId) : query;
}

const FRIENDLY: Array<[RegExp, string]> = [
  [/duplicate key.*product_code|products_product_code_key/i, "Kode barang sudah dipakai. Gunakan kode lain."],
  [/duplicate key/i, "Data dengan nilai yang sama sudah ada."],
  [/violates foreign key constraint.*(sale_items|stock_movements|purchase_items|return_items)/i, "Data ini masih dipakai di transaksi, tidak bisa dihapus. Nonaktifkan saja."],
  [/violates foreign key constraint/i, "Data terkait tidak ditemukan atau masih digunakan di tempat lain."],
  [/violates not-null constraint.*"(\w+)"/i, "Kolom wajib belum diisi."],
  [/violates check constraint/i, "Nilai yang dimasukkan tidak valid (cek angka negatif / pilihan)."],
  [/row-level security/i, "Akses ditolak. Silakan login ulang."],
  [/JWT expired|invalid JWT/i, "Sesi habis. Silakan login ulang."],
  [/Failed to fetch|NetworkError/i, "Tidak dapat terhubung ke server. Periksa koneksi internet."],
];

export function friendlyError(err: any): string {
  const msg: string = err?.message || String(err ?? "Terjadi kesalahan");
  // RPCs raise "CODE: human message" – show only the human part.
  const rpc = msg.match(/^[A-Z_]{4,}:\s*(.+)$/);
  if (rpc) return rpc[1];
  for (const [re, text] of FRIENDLY) if (re.test(msg)) return text;
  return msg;
}

/** Throws a readable Error when a Supabase call failed, otherwise returns data. */
export function unwrap<T>(res: { data: T; error: any }): T {
  if (res.error) {
    console.error("[db]", res.error);
    throw new Error(friendlyError(res.error));
  }
  return res.data;
}
