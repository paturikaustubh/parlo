"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconLayoutDashboard,
  IconQrcode,
  IconCar,
  IconChartBar,
} from "@tabler/icons-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: IconLayoutDashboard },
  { href: "/scan", label: "Scan QR", icon: IconQrcode },
  { href: "/vehicles", label: "Vehicles", icon: IconCar },
  { href: "/analytics", label: "Analytics", icon: IconChartBar },
];

export function UserSidebar() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Sidebar navigation"
      className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-background h-full fixed top-16 bottom-0 left-0 z-30 overflow-y-auto"
    >
      <nav className="flex flex-col gap-1 p-3 pt-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
