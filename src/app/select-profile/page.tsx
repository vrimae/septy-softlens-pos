"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { usersService } from "@/lib/services/users.service";
import { Loader2 } from "lucide-react";
import { auditService } from "@/lib/services/audit.service";

export default function SelectProfilePage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session first
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      
      try {
        const data = await usersService.getAllUsers();
        // Only show active profiles
        setProfiles(data.filter((p: any) => p.is_active !== false && p.status !== 'INACTIVE'));
      } catch (err) {
        console.error("Failed to load profiles:", err);
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, [router]);

  const handleSelectProfile = (profile: any) => {
    // Store in localStorage
    localStorage.setItem("septy_active_profile", JSON.stringify(profile));
    auditService.log("LOGIN_SISTEM", { reason: "Login perangkat kasir: " + profile.full_name }).catch(console.error);
    
    // Redirect directly based on role to avoid flashes or errors
    if (profile.role?.toUpperCase() === 'OWNER') {
      router.push("/");
    } else {
      router.push("/pos");
    }
  };

  const handleLogoutMesin = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("septy_active_profile");
    router.push("/login");
  };

  const getProfileColor = (role: string) => {
    switch(role?.toUpperCase()) {
      case 'OWNER': return 'bg-gradient-to-br from-purple-500 to-indigo-600';
      case 'ADMIN': return 'bg-gradient-to-br from-blue-500 to-cyan-500';
      default: return 'bg-gradient-to-br from-emerald-400 to-teal-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center text-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-400">Memuat profil pengguna...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center font-sans text-white relative">
      <h1 className="text-3xl md:text-4xl font-normal tracking-wide text-white mb-16">
        Siapa yang bertugas?
      </h1>

      <div className="flex flex-wrap justify-center gap-10 md:gap-16 max-w-4xl px-6">
        {profiles.map((profile) => (
          <div 
            key={profile.id} 
            onClick={() => handleSelectProfile(profile)}
            className="flex flex-col items-center group cursor-pointer"
          >
            <div className={`w-28 h-28 md:w-32 md:h-32 rounded-3xl flex items-center justify-center shadow-lg transition-transform duration-300 transform group-hover:scale-105 group-hover:ring-4 group-hover:ring-white/20 ${getProfileColor(profile.role)}`}>
              <span className="text-4xl md:text-5xl font-bold text-white shadow-sm">
                {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : "U"}
              </span>
            </div>
            <h2 className="mt-6 text-lg md:text-xl font-medium text-gray-200 group-hover:text-white transition-colors">
              {profile.full_name || "Unknown"}
            </h2>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-widest uppercase mt-1">
              {profile.role || "KASIR"}
            </p>
          </div>
        ))}
        {profiles.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">Belum ada pengguna. Silakan login sebagai Owner dan tambahkan di Manajemen User.</p>
        )}
      </div>

      <button 
        onClick={handleLogoutMesin}
        className="absolute bottom-12 px-6 py-2.5 rounded-full border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 hover:bg-white dark:bg-[#13151a]/5 transition-all text-sm font-medium"
      >
        Logout Mesin
      </button>
    </div>
  );
}
