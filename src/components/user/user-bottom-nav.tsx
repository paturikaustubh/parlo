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
  { href: "/dashboard", label: "Home", icon: IconLayoutDashboard },
  { href: "/scan", label: "Scan", icon: IconQrcode },
  { href: "/vehicles", label: "Vehicles", icon: IconCar },
  { href: "/analytics", label: "Analytics", icon: IconChartBar },
];

export function UserBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-background border-t border-border"
    >
      <div className="grid grid-cols-4 h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              {label}
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
