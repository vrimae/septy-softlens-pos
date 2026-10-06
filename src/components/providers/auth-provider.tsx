"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";

type AuthContextType = {
  user: User | null;
  activeProfile: any | null;
  role: string | null;
  loading: boolean;
  branches: any[];
  activeBranch: any | null;
  setActiveBranch: (branch: any) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  activeProfile: null,
  role: null,
  loading: true,
  branches: [],
  activeBranch: null,
  setActiveBranch: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeProfile, setActiveProfile] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [branches, setBranches] = useState<any[]>([]);
  const [activeBranch, setActiveBranchState] = useState<any | null>(null);

  const setActiveBranch = (branch: any) => {
    setActiveBranchState(branch);
    if (branch) {
      localStorage.setItem('septy_active_branch', JSON.stringify(branch));
    } else {
      localStorage.removeItem('septy_active_branch');
    }
    // Force reload to refresh all data in the SPA for the new branch
    if (typeof window !== 'undefined' && branch) {
      // Small timeout to allow state to save
      setTimeout(() => window.location.reload(), 100);
    }
  };
  
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Fetch branches
      const { data: branchData } = await supabase.from('branches').select('*').eq('is_active', true);
      if (branchData && mounted) {
        setBranches(branchData);
        
        // Load active branch
        const savedBranch = localStorage.getItem('septy_active_branch');
        if (savedBranch) {
          try { setActiveBranchState(JSON.parse(savedBranch)); } catch(e) {}
        } else if (branchData.length > 0) {
          setActiveBranchState(branchData[0]);
          localStorage.setItem('septy_active_branch', JSON.stringify(branchData[0]));
        }
      }

      if (session?.user && mounted) {
        setUser(session.user);
        
        // Read active profile from localStorage
        const savedProfile = localStorage.getItem("septy_active_profile");
        if (savedProfile) {
          try {
            const parsed = JSON.parse(savedProfile);
            setActiveProfile(parsed);
            setRole(parsed.role?.toLowerCase() || 'kasir');
          } catch (e) {}
        }
        
      } else {
        if (mounted) {
          setUser(null);
          setActiveProfile(null);
          setRole(null);
        }
      }
      
      if (mounted) setLoading(false);
    }

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
          setActiveProfile(null);
          setRole(null);
          localStorage.removeItem("septy_active_profile");
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    
    const isAuthPage = pathname === '/login' || pathname === '/register';
    
    if (!user && !isAuthPage) {
      router.push('/login');
    } else if (user && !activeProfile && pathname !== '/select-profile' && !isAuthPage) {
      router.push('/select-profile');
    }
  }, [user, activeProfile, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, activeProfile, role, loading, branches, activeBranch, setActiveBranch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
