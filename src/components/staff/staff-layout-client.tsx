"use client";

import { StaffSidebar } from "./staff-sidebar";
import { StaffBottomNav } from "./staff-bottom-nav";
import { AppHeader } from "../shared/app-header";

export function StaffLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AppHeader />
      <div className="flex">
        <StaffSidebar />
        <main className="flex-1 md:pl-56 pt-16">
          <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
      <StaffBottomNav />
    </div>
  );
}
