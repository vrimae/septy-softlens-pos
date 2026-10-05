"use client";

export default function RestockPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">AI Restock & Min. Stock</h1>
        <p className="text-gray-500 mt-1">Rekomendasi belanja berdasarkan kecepatan penjualan 30 hari terakhir.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <input 
            type="text"
            placeholder="Cari produk..."
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
          />
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-gray-500 font-medium">Tidak ada produk yang cocok dengan pencarian.</p>
        </div>
      </div>
    </div>
  );
}
