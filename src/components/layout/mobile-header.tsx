"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function MobileHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-[#13151a] border-b border-gray-100 dark:border-gray-800/50 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 font-bold italic text-xs shadow-sm">
          Septy
        </div>
        <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">Septy Softlens</span>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-gray-50 dark:bg-[#1e2329] rounded-lg text-gray-600 dark:text-gray-400"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Sidebar Drawer on the Right */}
          <div className="relative w-[280px] bg-white dark:bg-[#13151a] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full z-50 text-gray-600 dark:text-gray-400"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex-1 overflow-hidden" onClick={(e) => {
               // Close sidebar when a link is clicked
               if ((e.target as HTMLElement).closest('a')) {
                 setIsOpen(false);
               }
            }}>
              <Sidebar isMobile={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
