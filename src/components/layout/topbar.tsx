"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, Menu, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Topbar() {
  const { activeProfile, role } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="h-16 bg-white dark:bg-[#13151a] dark:bg-[#13151a] border-b border-gray-200 dark:border-gray-800 dark:border-gray-800 flex items-center justify-between px-4 md:px-6 z-10 transition-colors">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden text-gray-700 dark:text-gray-300 dark:text-gray-300"
          onClick={() => alert("Versi mobile dari dashboard saat ini sedang dioptimalkan. Silakan gunakan perangkat Desktop/Tablet untuk pengalaman terbaik.")}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-400">
          <UserCircle className="h-5 w-5" />
          <span>{activeProfile?.full_name || "POS User"} ({role?.toUpperCase() || "KASIR"})</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/select-profile")} className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-900/20">
          <UserCircle className="h-4 w-4 mr-2" />
          Ganti Profil
        </Button>
      </div>
    </header>
  );
}
