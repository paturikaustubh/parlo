"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  IconLayoutDashboard,
  IconActivity,
  IconTicket,
  IconListCheck,
  IconSettings2,
  IconMapPin,
  IconUsers,
  IconBuilding,
  IconChartBar,
  IconTrendingUp,
  IconFileText,
  IconCreditCard,
  IconSettings,
  IconCar,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface SubItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface Tab {
  key: string;
  label: string;
  icon: React.ElementType;
  items: SubItem[];
}

const TABS: Tab[] = [
  {
    key: "home",
    label: "Home",
    icon: IconLayoutDashboard,
    items: [{ href: "/owner", label: "Dashboard", icon: IconLayoutDashboard }],
  },
  {
    key: "activity",
    label: "Activity",
    icon: IconActivity,
    items: [
      { href: "/owner/sessions", label: "Sessions", icon: IconTicket },
      { href: "/owner/queue", label: "Requests", icon: IconListCheck },
      { href: "/owner/vehicles", label: "Vehicles", icon: IconCar },
    ],
  },
  {
    key: "manage",
    label: "Manage",
    icon: IconSettings2,
    items: [
      { href: "/owner/spaces", label: "Spaces", icon: IconMapPin },
      { href: "/owner/staff", label: "Staff", icon: IconUsers },
      { href: "/owner/business", label: "Business", icon: IconBuilding },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: IconChartBar,
    items: [
      { href: "/owner/reports", label: "Reports", icon: IconChartBar },
      { href: "/owner/analytics", label: "Analytics", icon: IconTrendingUp },
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

export function OwnerBottomNav() {
  const pathname = usePathname();
  const [openTab, setOpenTab] = useState<string | null>(null);

  function isTabActive(tab: Tab) {
    return tab.items.some((item) =>
      item.href === "/owner"
        ? pathname === "/owner" // exact — avoids /owner/* false positives
        : pathname === item.href || pathname.startsWith(item.href + "/"),
    );
  }

  function handleTabPress(tab: Tab) {
    setOpenTab(openTab === tab.key ? null : tab.key);
  }

  return (
    <nav
      aria-label="Owner main navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-background border-t border-border"
    >
      <div className="grid grid-cols-4 h-16">
        {TABS.map((tab) => {
          const active = isTabActive(tab);
          const Icon = tab.icon;
          const isOpen = openTab === tab.key;

          return (
            <Popover
              key={tab.key}
              open={isOpen}
              onOpenChange={(o) => setOpenTab(o ? tab.key : null)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={tab.label}
                  onClick={() => handleTabPress(tab)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                    active || isOpen ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon size={20} strokeWidth={active || isOpen ? 2.2 : 1.8} />
                  {tab.label}
                  {active && (
                    <span className="absolute bottom-0 w-6 h-0.5 rounded-full bg-primary" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="center"
                sideOffset={8}
                className="w-44 p-1"
                onInteractOutside={() => setOpenTab(null)}
              >
                <div className="flex flex-col">
                  {tab.items.map((item) => {
                    const ItemIcon = item.icon;
                    const itemActive =
                      pathname === item.href ||
                      pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenTab(null)}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                          itemActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <ItemIcon
                          size={15}
                          strokeWidth={itemActive ? 2.2 : 1.8}
                        />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </nav>
  );
}
