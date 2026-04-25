"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useValtrioxStore } from "@/store/brandflow-store";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const sidebarCollapsed = useValtrioxStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className={cn(
        "transition-[padding] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        sidebarCollapsed ? "lg:pl-[60px]" : "lg:pl-[260px]",
      )}>
        <Header />
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
