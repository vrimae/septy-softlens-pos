export default function AIInsightsPage() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="bg-white dark:bg-[#13151a] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-normal mb-2">Insight & Rekomendasi AI</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
          Analisis cerdas berdasarkan histori penjualan, stok, dan mutasi. Semua rekomendasi dirancang transparan (explainable) agar Anda dapat membuat keputusan terbaik.
        </p>
      </div>

      <div className="bg-white dark:bg-[#13151a] p-16 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center text-center">
        <h3 className="text-lg font-medium text-gray-400 dark:text-gray-500 mb-2">Belum ada insight saat ini.</h3>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          AI membutuhkan lebih banyak data transaksi dan histori stok untuk menghasilkan rekomendasi.
        </p>
      </div>
    </div>
  );
}
