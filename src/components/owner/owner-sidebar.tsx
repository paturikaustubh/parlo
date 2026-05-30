"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconLayoutDashboard,
  IconTicket,
  IconListCheck,
  IconMapPin,
  IconUsers,
  IconBuilding,
  IconChartBar,
  IconFileText,
  IconCreditCard,
  IconSettings,
  IconCar,
} from "@tabler/icons-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
}

interface Section {
  header?: string;
  items: NavItem[];
}

const SECTIONS: Section[] = [
  {
    items: [
      {
        href: "/owner",
        label: "Dashboard",
        icon: IconLayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    header: "Activity",
    items: [
      { href: "/owner/sessions", label: "Sessions", icon: IconTicket },
      { href: "/owner/queue", label: "Requests", icon: IconListCheck },
      { href: "/owner/vehicles", label: "Vehicles", icon: IconCar },
    ],
  },
  {
    header: "Manage",
    items: [
      { href: "/owner/spaces", label: "Spaces", icon: IconMapPin },
      { href: "/owner/staff", label: "Staff", icon: IconUsers },
      { href: "/owner/business", label: "Business", icon: IconBuilding },
    ],
  },
  {
    header: "Reports",
    items: [
      { href: "/owner/reports", label: "Reports", icon: IconChartBar },
      { href: "/owner/activity", label: "Activity", icon: IconFileText },
      {
        href: "/owner/subscription",
        label: "Subscription",
        icon: IconCreditCard,
      },
      { href: "/owner/settings", label: "Settings", icon: IconSettings },
    ],
  },
];

export function OwnerSidebar() {
  const pathname = usePathname();

  function isActive(item: NavItem) {
    return item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <aside
      aria-label="Owner navigation"
      className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-background fixed top-16 bottom-0 left-0 z-30"
    >
      <nav className="flex-1 min-h-0 overflow-y-auto flex flex-col p-3 pt-4 gap-0">
        {SECTIONS.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-4" : ""}>
            {section.header && (
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-3 mb-1">
                {section.header}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                      section.header ? "pl-5" : "",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
