// Util QRIS (standar EMVCo / QRIS Indonesia).
// Mengubah QRIS statis milik toko menjadi QRIS dinamis yang sudah berisi nominal transaksi.

function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function parseTLV(data: string): { tag: string; value: string }[] | null {
  const out: { tag: string; value: string }[] = [];
  let i = 0;
  while (i < data.length) {
    if (i + 4 > data.length) return null;
    const tag = data.substr(i, 2);
    const len = parseInt(data.substr(i + 2, 2), 10);
    if (isNaN(len) || i + 4 + len > data.length) return null;
    out.push({ tag, value: data.substr(i + 4, len) });
    i += 4 + len;
  }
  return out;
}

export function isValidQris(raw: string): boolean {
  const s = (raw || "").trim();
  if (s.length < 30 || !s.startsWith("000201")) return false;
  const tlv = parseTLV(s);
  if (!tlv) return false;
  const crcTag = tlv.find((t) => t.tag === "63");
  if (!crcTag) return false;
  return crc16(s.slice(0, -4)) === crcTag.value.toUpperCase();
}

/** Bersihkan string QRIS dari whitespace liar/newline tanpa menghapus spasi valid di dalam nama merchant/kota. */
export function cleanQris(raw: string): string {
  const trimmed = (raw || "").replace(/[\r\n\t]+/g, "").trim();
  if (isValidQris(trimmed)) return trimmed;
  // Fallback: jika pengguna menyalin dengan spasi acak di antara karakter/grup
  const noSpaces = trimmed.replace(/\s+/g, "");
  if (isValidQris(noSpaces)) return noSpaces;
  return trimmed;
}

/** Bangun QRIS dinamis dengan nominal. Mengembalikan null jika data QRIS toko tidak valid. */
export function buildDynamicQris(raw: string, amount: number): string | null {
  const s = cleanQris(raw);
  if (!isValidQris(s)) return null;
  const tlv = parseTLV(s)!;
  const amt = String(Math.round(amount));
  const parts: { tag: string; value: string }[] = [];
  for (const t of tlv) {
    if (t.tag === "63" || t.tag === "54") continue; // CRC & nominal lama dibuang
    if (t.tag === "01") {
      parts.push({ tag: "01", value: "12" }); // 12 = dinamis
      continue;
    }
    if (t.tag === "58" && amount > 0) {
      parts.push({ tag: "54", value: amt }); // nominal harus sebelum kode negara
    }
    parts.push(t);
  }
  const body =
    parts.map((p) => p.tag + String(p.value.length).padStart(2, "0") + p.value).join("") + "6304";
  return body + crc16(body);
}
