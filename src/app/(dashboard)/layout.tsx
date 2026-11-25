import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { FloatingChatbot } from "@/components/FloatingChatbot";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#fdfdfd] dark:bg-[#0f1115] font-sans text-slate-800 dark:text-slate-200">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <MobileHeader />
        <main className="flex-1 overflow-y-auto overflow-x-scroll p-4 md:p-8 lg:p-10 relative">
          {children}
        </main>
      </div>
      <FloatingChatbot />
    </div>
  );
}
