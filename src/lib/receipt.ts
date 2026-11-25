// ==============================================================================
// Util Struk & Label Thermal: membangun HTML struk & barcode label yang presisi
// untuk printer thermal 58mm / 80mm dan mencetaknya lewat iframe tersembunyi
// tanpa merusak DOM atau memicu reload halaman.
// Kompatibel penuh dengan printer PUTIANPOS RPP02N / 58D-03 / POS-58 (USB & Bluetooth).
// ==============================================================================

export type ReceiptData = {
  storeName: string;
  address?: string;
  phone?: string;
  footer?: string;
  branchName?: string;
  cashier?: string;
  customer?: string;
  invoice: string;
  date: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  discount: number;
  total: number;
  payments: { label: string; amount: number }[];
  change: number;
};

export type PaperWidth = 58 | 80 | 104;

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const rp = (n: number) => Number(n || 0).toLocaleString("id-ID");

export function calculateReceiptHeightMm(d: ReceiptData): number {
  let mm = 4; // Padding atas & bawah

  // 1. Header toko
  mm += 7; // Nama toko
  if (d.address) mm += Math.max(1, Math.ceil((d.address.length || 0) / 26)) * 4.2;
  if (d.phone) mm += 4.2;
  if (d.branchName) mm += 4.2;
  mm += 3; // Divider

  // 2. Metadata transaksi
  mm += 4.2; // No. Struk
  mm += 4.2; // Tanggal
  if (d.cashier) mm += 4.2;
  if (d.customer) mm += 4.2;
  mm += 3; // Divider

  // 3. Daftar barang
  for (const it of d.items || []) {
    const lines = Math.max(1, Math.ceil((it.name?.length || 1) / 24));
    mm += lines * 4.2;
    mm += 4.2; // qty x price
    mm += 1.5;
  }
  mm += 3; // Divider

  // 4. Subtotal, diskon & total
  mm += 4.2; // Subtotal
  if (d.discount > 0) mm += 4.2;
  mm += 6.0; // TOTAL
  mm += 3; // Divider

  // 5. Pembayaran & kembali
  for (let i = 0; i < (d.payments?.length || 1); i++) {
    mm += 4.2;
  }
  mm += 4.2; // Kembali
  mm += 3; // Divider

  // 6. Footer & catatan
  if (d.footer) mm += Math.max(1, Math.ceil((d.footer.length || 1) / 26)) * 4.2;
  mm += 8.5; // Catatan tidak dapat ditukar

  // 7. Margin sobek pisau manual (tear-off margin)
  mm += 10;

  return Math.max(50, Math.ceil(mm));
}

export function buildReceiptHtml(d: ReceiptData, paper: PaperWidth = 58): string {
  // Kalibrasi ukuran cetak presisi:
  // Kertas 58mm -> lebar head fisik 48mm.
  const base = paper === 58 ? 10 : paper === 80 ? 12 : 13;
  const printWidth = paper === 58 ? 48 : paper === 80 ? 72 : 94;
  const heightMm = calculateReceiptHeightMm(d);

  const row = (l: string, r: string, bold = false) =>
    `<div class="row${bold ? " bold" : ""}"><span class="l">${l}</span><span class="r">${r}</span></div>`;

  const items = (d.items || [])
    .map(
      (it) => `
      <div class="item">
        <div class="name">${esc(it.name)}</div>
        <div class="row">
          <span class="l">${it.qty} x ${rp(it.price)}</span>
          <span class="r">${rp(it.qty * it.price)}</span>
        </div>
      </div>`
    )
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Struk ${esc(d.invoice)}</title>
<style>
  @page {
    size: ${paper}mm ${heightMm}mm;
    margin: 0mm !important;
  }
  * {
    box-sizing: border-box !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    color: #000 !important;
    width: 100% !important;
  }
  body {
    font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, sans-serif;
    font-size: ${base}px;
    line-height: 1.3;
    word-break: break-word;
    overflow-wrap: break-word;
    text-align: left;
    color: #000 !important;
    background: #fff !important;
  }
  .receipt-wrap {
    width: ${printWidth}mm;
    max-width: ${printWidth}mm;
    margin: 0 auto;
    padding: 1.5mm 0.5mm 3mm 0.5mm;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .title { 
    font-size: ${base + 2}px; 
    font-weight: bold; 
    line-height: 1.25; 
    margin-bottom: 2px;
  }
  .muted { font-size: ${base - 1}px; color: #000 !important; }
  .divider { 
    border-top: 1px dashed #000; 
    margin: 3px 0; 
    width: 100%; 
  }
  .row { 
    display: flex; 
    justify-content: space-between; 
    align-items: flex-start;
    gap: 2px; 
    width: 100%;
    margin-bottom: 1px;
  }
  .row .l { 
    flex: 1 1 auto; 
    min-width: 0; 
    word-break: break-word; 
  }
  .row .r { 
    flex: 0 0 auto; 
    text-align: right; 
    white-space: nowrap; 
    margin-left: auto;
  }
  .item { 
    margin-bottom: 2px; 
    page-break-inside: avoid !important; 
    break-inside: avoid !important; 
  }
  .item .name { 
    font-weight: bold; 
    line-height: 1.2;
    word-break: break-word; 
  }
  .total { 
    font-size: ${base + 1.5}px; 
    font-weight: bold; 
    margin: 2px 0;
  }
  
  @media print {
    @page {
      size: ${paper}mm ${heightMm}mm;
      margin: 0mm !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      color: #000 !important;
      width: ${paper}mm !important;
    }
    .receipt-wrap {
      width: ${printWidth}mm !important;
      max-width: ${printWidth}mm !important;
      margin: 0 auto !important;
      padding: 1mm 0.5mm 3mm 0.5mm !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .item, .row, .divider {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  }
</style>
</head>
<body>
<div class="receipt-wrap">
  <div class="center title">${esc(d.storeName)}</div>
  ${d.address ? `<div class="center muted">${esc(d.address)}</div>` : ""}
  ${d.phone ? `<div class="center muted">Telp/WA: ${esc(d.phone)}</div>` : ""}
  ${d.branchName ? `<div class="center muted">Cabang: ${esc(d.branchName)}</div>` : ""}
  <div class="divider"></div>
  <div class="muted">
    ${row("No. Struk", esc(d.invoice))}
    ${row("Tanggal", esc(d.date))}
    ${d.cashier ? row("Kasir", esc(d.cashier)) : ""}
    ${d.customer ? row("Pelanggan", esc(d.customer)) : ""}
  </div>
  <div class="divider"></div>
  ${items}
  <div class="divider"></div>
  ${row("Subtotal", rp(d.subtotal))}
  ${d.discount > 0 ? row("Potongan Harga", `- ${rp(d.discount)}`) : ""}
  <div class="total">${row("TOTAL", rp(d.total), true)}</div>
  <div class="divider"></div>
  ${(d.payments || []).map((p) => row(esc(p.label), rp(p.amount))).join("")}
  ${row("KEMBALI", rp(d.change), true)}
  <div class="divider"></div>
  <div class="center muted">${esc(d.footer || "Terima kasih telah berbelanja di Septy Softlens!")}</div>
  <div class="center muted" style="margin-top:2px">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</div>
</div>
</body>
</html>`;
}

export function printReceipt(d: ReceiptData, paper: PaperWidth = 58) {
  // 1. Jika preview struk di modal sedang aktif/terbuka, gunakan langsung iframe tersebut.
  // Ini 100% instan dan tidak akan pernah diblokir Chrome karena langsung dari gesture klik user!
  const previewFrame = document.getElementById("preview-receipt-iframe") as HTMLIFrameElement;
  if (previewFrame && previewFrame.contentWindow) {
    try {
      previewFrame.contentWindow.focus();
      previewFrame.contentWindow.print();
      return;
    } catch (e) {
      console.warn("Direct preview print failed, fallback to helper frame:", e);
    }
  }

  // 2. Helper iframe untuk auto-print (di-posisikan 1x1px di pojok kanan bawah, in-viewport agar tidak diblokir Chrome)
  let iframe = document.getElementById("thermal-print-iframe") as HTMLIFrameElement;
  if (iframe) {
    try { iframe.remove(); } catch (e) {}
  }

  iframe = document.createElement("iframe");
  iframe.id = "thermal-print-iframe";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "none";
  iframe.style.margin = "0";
  iframe.style.padding = "0";
  iframe.style.zIndex = "-1";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(buildReceiptHtml(d, paper));
  doc.close();

  const doPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Print error:", e);
    }
  };

  setTimeout(doPrint, 100);
}

// ==============================================================================
// CETAK LABEL BARCODE PRODUK (THERMAL 58MM / STIKER LABEL)
// ==============================================================================

export type ProductLabelData = {
  name: string;
  price: number;
  code: string;
  storeName?: string;
};

export function buildProductLabelHtml(data: ProductLabelData, svgBarcodeHtml: string): string {
  const esc = (s: string) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Label ${esc(data.code)}</title>
<style>
  @page {
    size: 58mm 42mm;
    margin: 0 !important;
  }
  * {
    box-sizing: border-box !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    color: #000 !important;
    width: 48mm !important;
    height: 42mm !important;
  }
  body {
    font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 10px;
    line-height: 1.25;
    width: 44mm;
    max-width: 44mm;
    margin: 0 auto !important;
    padding: 1mm 0.5mm 1mm 0.5mm !important;
    word-break: break-word;
    text-align: center;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .store-tag {
    font-size: 8.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #333;
    margin-bottom: 2px;
  }
  .divider { border-top: 1px dashed #000; margin: 2px 0; width: 100%; }
  .prod-name {
    font-size: 10px;
    font-weight: bold;
    line-height: 1.2;
    margin: 1px 0;
    word-break: break-word;
    max-width: 43mm;
  }
  .prod-price {
    font-size: 12px;
    font-weight: 800;
    margin: 1px 0 2px 0;
    color: #000;
  }
  .barcode-wrap {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    margin: 1px 0;
  }
  .barcode-wrap svg {
    max-width: 42mm !important;
    height: auto !important;
    display: block;
    margin: 0 auto;
  }
  @media print {
    @page {
      size: 58mm 42mm;
      margin: 0 !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 48mm !important;
    }
    body {
      width: 44mm !important;
      max-width: 44mm !important;
      margin: 0 auto !important;
      padding: 1mm 0.5mm !important;
    }
    .barcode-wrap, .divider {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  }
</style>
</head>
<body>
  <div class="store-tag">${esc(data.storeName || "Septy Softlens")}</div>
  <div class="divider"></div>
  <div class="prod-name">${esc(data.name)}</div>
  <div class="prod-price">Rp ${rp(data.price)}</div>
  <div class="barcode-wrap">${svgBarcodeHtml}</div>
  <div class="divider"></div>
</body>
</html>`;
}

export function printProductLabel(data: ProductLabelData, svgBarcodeHtml: string) {
  let iframe = document.getElementById("thermal-label-iframe") as HTMLIFrameElement;
  if (iframe) {
    try { iframe.remove(); } catch (e) {}
  }

  iframe = document.createElement("iframe");
  iframe.id = "thermal-label-iframe";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "none";
  iframe.style.margin = "0";
  iframe.style.padding = "0";
  iframe.style.zIndex = "-1";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(buildProductLabelHtml(data, svgBarcodeHtml));
  doc.close();

  const doPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Label print error:", e);
    }
  };

  setTimeout(doPrint, 100);
}

// ==============================================================================
// KONEKSI BLUETOOTH THERMAL PRINTER NATIVE (PUTIANPOS RPP02N / 58D-03 / POS-58)
// Mengirim perintah ESC/POS langsung lewat Web Bluetooth tanpa print dialog browser.
// ==============================================================================

const COMMON_PRINTER_SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb", // Standard ESC/POS Service
  "0000ffe0-0000-1000-8000-00805f9b34fb", // Chinese POS Thermal Printer (RPP02N / POS-58)
  "0000ff00-0000-1000-8000-00805f9b34fb", // Alternative POS Service
  "49535343-fe7d-4ae5-8fa9-9fafd205e455", // ISSC Transparent UART
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2", // Vendor POS UART
  "0000af30-0000-1000-8000-00805f9b34fb",
  "0000ae00-0000-1000-8000-00805f9b34fb",
];

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

/**
 * Format receipt data menjadi ESC/POS bytes 32 kolom untuk printer thermal 58mm RPP02N.
 * PENTING: Printer 58mm portabel RPP02N TIDAK memiliki auto-cutter.
 * Jangan pernah mengirim GS V (Cut paper) karena akan menyebabkan printer masuk
 * mode kalibrasi black-mark dan mengeluarkan kertas tanpa henti!
 */
export function buildReceiptEscPos(d: ReceiptData, paper: PaperWidth = 58): Uint8Array {
  const width = paper === 58 ? 32 : 48;
  const divider = "-".repeat(width) + "\n";
  const rp = (n: number) => Number(n || 0).toLocaleString("id-ID");

  function row(left: string, right: string): string {
    left = String(left || "");
    right = String(right || "");
    const space = width - left.length - right.length;
    if (space >= 1) {
      return left + " ".repeat(space) + right + "\n";
    }
    return left + "\n" + " ".repeat(Math.max(0, width - right.length)) + right + "\n";
  }

  function center(text: string): string {
    text = String(text || "").trim();
    if (text.length >= width) return text + "\n";
    const pad = Math.floor((width - text.length) / 2);
    return " ".repeat(pad) + text + "\n";
  }

  const ESC = "\x1b";
  const GS = "\x1d";

  let buf = "";
  // 1. Inisialisasi printer ESC @
  buf += ESC + "@";
  // Set character code table ke PC437 (Standar)
  buf += ESC + "t\x00";
  // Reset line spacing ke standar 1/6 inci
  buf += ESC + "2";

  // 2. Header Toko
  buf += ESC + "a\x01"; // Align Center
  buf += ESC + "E\x01"; // Bold On
  buf += GS + "!\x11"; // Double Height & Width
  buf += (d.storeName || "Septy Softlens") + "\n";
  buf += GS + "!\x00"; // Normal size
  buf += ESC + "E\x00"; // Bold Off

  if (d.address) buf += center(d.address);
  if (d.phone) buf += center("Telp/WA: " + d.phone);
  if (d.branchName) buf += center("Cabang: " + d.branchName);

  // 3. Metadata Transaksi
  buf += ESC + "a\x00"; // Align Left
  buf += divider;
  buf += row("No. Struk", d.invoice);
  buf += row("Tanggal", d.date);
  if (d.cashier) buf += row("Kasir", d.cashier);
  if (d.customer) buf += row("Pelanggan", d.customer);
  buf += divider;

  // 4. Daftar Barang
  for (const it of d.items || []) {
    buf += (it.name || "Produk") + "\n";
    buf += row(" " + it.qty + " x " + rp(it.price), rp(it.qty * it.price));
  }
  buf += divider;

  // 5. Total & Pembayaran
  buf += row("Subtotal", rp(d.subtotal));
  if (d.discount > 0) buf += row("Diskon", "- " + rp(d.discount));

  buf += ESC + "E\x01"; // Bold On
  buf += row("TOTAL", rp(d.total));
  buf += ESC + "E\x00"; // Bold Off
  buf += divider;

  for (const p of d.payments || []) {
    buf += row(p.label, rp(p.amount));
  }
  buf += ESC + "E\x01"; // Bold On
  buf += row("KEMBALI", rp(d.change));
  buf += ESC + "E\x00"; // Bold Off
  buf += divider;

  // 6. Footer Struk
  buf += ESC + "a\x01"; // Align Center
  buf += (d.footer || "Terima kasih telah berbelanja di Septy Softlens!") + "\n";
  buf += "Barang yang sudah dibeli tidak\ndapat ditukar/dikembalikan.\n";

  // 7. Feed 3-4 baris kertas agar melewati pisau sobek manual, lalu reset printer
  buf += "\n\n\n\n";
  buf += ESC + "@";

  return new TextEncoder().encode(buf);
}

let cachedBtDevice: any = null;
let cachedBtCharacteristic: any = null;

async function getOrConnectBtCharacteristic(): Promise<any> {
  const nav = (typeof navigator !== "undefined" ? navigator : null) as any;
  if (!nav || !nav.bluetooth) {
    throw new Error("Web Bluetooth tidak didukung pada browser ini. Harap gunakan Google Chrome atau Microsoft Edge (Windows / Android).");
  }

  // Jika sudah tersambung dan masih aktif, gunakan kembali koneksi aktif
  if (cachedBtDevice && cachedBtDevice.gatt?.connected && cachedBtCharacteristic) {
    return cachedBtCharacteristic;
  }

  let device = cachedBtDevice;
  if (!device || !device.gatt?.connected) {
    device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: COMMON_PRINTER_SERVICES,
    });
    cachedBtDevice = device;
  }

  const server = await device.gatt.connect();

  // Cari characteristic yang mendukung perintah Write
  let foundChar: any = null;
  for (const sUuid of COMMON_PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(sUuid);
      const chars = await service.getCharacteristics();
      for (const ch of chars) {
        if (ch.properties.writeWithoutResponse || ch.properties.write) {
          foundChar = ch;
          break;
        }
      }
      if (foundChar) break;
    } catch (e) {}
  }

  if (!foundChar) {
    try {
      const services = await server.getPrimaryServices();
      for (const service of services) {
        try {
          const chars = await service.getCharacteristics();
          for (const ch of chars) {
            if (ch.properties.writeWithoutResponse || ch.properties.write) {
              foundChar = ch;
              break;
            }
          }
          if (foundChar) break;
        } catch (e) {}
      }
    } catch (e) {}
  }

  if (!foundChar) {
    throw new Error("Karakteristik cetak printer tidak ditemukan pada perangkat Bluetooth ini.");
  }

  cachedBtCharacteristic = foundChar;
  return foundChar;
}

/**
 * Mencetak struk thermal langsung ke printer PUTIANPOS RPP02N via Web Bluetooth.
 * Menggunakan chunk size 20 bytes (BLE MTU standard) dan jeda 20ms agar buffer printer tidak overflow.
 */
export async function printReceiptViaBluetooth(
  d: ReceiptData,
  paper: PaperWidth = 58
): Promise<{ success: boolean; message: string }> {
  try {
    const char = await getOrConnectBtCharacteristic();
    const data = buildReceiptEscPos(d, paper);

    // Kirim data dalam potongan chunk 20-byte (BLE ATT standard payload) dengan jeda 20ms
    const CHUNK_SIZE = 20;
    for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
      const chunk = data.slice(offset, offset + CHUNK_SIZE);
      if (char.writeValueWithoutResponse) {
        await char.writeValueWithoutResponse(chunk);
      } else {
        await char.writeValue(chunk);
      }
      await new Promise((r) => setTimeout(r, 20));
    }

    return { success: true, message: "Struk berhasil dicetak ke Printer Bluetooth!" };
  } catch (err: any) {
    if (err.name === "NotFoundError") {
      return { success: false, message: "Pemilihan printer Bluetooth dibatalkan." };
    }
    cachedBtCharacteristic = null;
    return { success: false, message: err.message || "Gagal mencetak struk ke printer Bluetooth." };
  }
}

/**
 * Tes koneksi dan cetak uji coba struk thermal PUTIANPOS via Bluetooth.
 */
export async function printTestReceiptBluetooth(): Promise<{ success: boolean; message: string }> {
  const testData: ReceiptData = {
    storeName: "Septy Softlens",
    address: "Jl. Raya Sedati No. 12",
    phone: "081234567890",
    branchName: "Pusat",
    invoice: "TES-RPP02N-58",
    date: new Date().toLocaleString("id-ID"),
    cashier: "Kasir",
    customer: "Tes Printer",
    items: [{ name: "Uji Coba Printer PUTIANPOS RPP02N 58mm", qty: 1, price: 1000 }],
    subtotal: 1000,
    discount: 0,
    total: 1000,
    payments: [{ label: "Tunai", amount: 1000 }],
    change: 0,
    footer: "Koneksi Berhasil! Printer Siap Pakai.",
  };
  return printReceiptViaBluetooth(testData, 58);
}

/**
 * Mencetak struk thermal langsung ke printer USB thermal via Web Serial API (Chrome / Edge di Windows / Mac).
 * Mengirim byte perintah ESC/POS langsung lewat kabel USB tanpa melewati jendela dialog cetak Chrome
 * dan bebas dari masalah ukuran kertas 3.276 mm di komputer baru.
 */
export async function printReceiptViaWebSerial(
  d: ReceiptData,
  paper: PaperWidth = 58
): Promise<{ success: boolean; message: string }> {
  const nav = typeof navigator !== "undefined" ? (navigator as any) : null;
  if (!nav || !nav.serial) {
    return {
      success: false,
      message: "Browser ini belum mendukung Web Serial. Harap gunakan Google Chrome atau Microsoft Edge versi terbaru.",
    };
  }

  try {
    const port = await nav.serial.requestPort();
    await port.open({ baudRate: 9600 });
    const writer = port.writable.getWriter();
    const data = buildReceiptEscPos(d, paper);
    await writer.write(data);
    writer.releaseLock();
    await port.close();

    return { success: true, message: "Struk berhasil dicetak langsung via USB Serial!" };
  } catch (err: any) {
    if (err.name === "NotFoundError") {
      return { success: false, message: "Pemilihan perangkat USB dibatalkan." };
    }
    return { success: false, message: err.message || "Gagal mencetak via USB Serial." };
  }
}
