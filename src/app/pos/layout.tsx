import { AuthProvider } from "@/components/providers/auth-provider";

export default function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-100 flex flex-col">
      {/* Navbar khusus POS bisa diletakkan di dalam page atau di sini */}
      {children}
    </div>
  );
}
