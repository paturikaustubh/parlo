"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconLayoutDashboard,
  IconClipboardCheck,
  IconChartBar,
} from "@tabler/icons-react";

const NAV_ITEMS = [
  {
    href: "/verifier",
    label: "Dashboard",
    icon: IconLayoutDashboard,
    exact: true,
  },
  { href: "/verifier/reviews", label: "Reviews", icon: IconClipboardCheck },
  { href: "/verifier/analytics", label: "Analytics", icon: IconChartBar },
];

export function VerifierBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Verifier main navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-background border-t border-border"
    >
      <div className="grid grid-cols-3 h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + "/");
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
                <span className="absolute bottom-0 w-6 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
