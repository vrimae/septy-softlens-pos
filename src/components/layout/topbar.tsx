"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, Menu, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const { user, role } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-6 z-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
          <UserCircle className="h-5 w-5" />
          <span>{user?.email} ({role || 'Loading...'})</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
          <LogOut className="h-4 w-4 mr-2" />
          Keluar
        </Button>
      </div>
    </header>
  );
}
