"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  IconCar,
  IconBuildingStore,
  IconClipboardCheck,
  IconId,
} from "@tabler/icons-react";
import { useUser } from "@/contexts/user-context";
import { cn } from "@/lib/utils";

export function RoleChip() {
  const { roles } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const hasOwnerRole = roles.some((r) => r.role === "OWNER" && r.isActive);
  const hasVerifierRole = roles.some(
    (r) => r.role === "VERIFIER" && r.isActive,
  );
  const hasStaffRole = roles.some((r) => r.role === "STAFF" && r.isActive);

  // Only show chip when user has a non-base role to switch to/from
  if (!hasOwnerRole && !hasVerifierRole && !hasStaffRole) return null;

  const isOwnerView = pathname.startsWith("/owner");
  const isVerifierView = pathname.startsWith("/verifier");
  const isStaffView = pathname.startsWith("/staff");

  const currentLabel = isOwnerView
    ? "Owner"
    : isVerifierView
      ? "Verifier"
      : isStaffView
        ? "Staff"
        : "Parker";
  const CurrentIcon = isOwnerView
    ? IconBuildingStore
    : isVerifierView
      ? IconClipboardCheck
      : isStaffView
        ? IconId
        : IconCar;

  const roleOptions = [
    // Parker — always available as the base user view
    {
      key: "parker",
      label: "Parker",
      icon: IconCar,
      active: !isOwnerView && !isVerifierView && !isStaffView,
      onClick: () => router.push("/dashboard"),
      show: true,
    },
    {
      key: "staff",
      label: "Staff",
      icon: IconId,
      active: isStaffView,
      onClick: () => router.push("/staff"),
      show: hasStaffRole,
    },
    {
      key: "owner",
      label: "Owner",
      icon: IconBuildingStore,
      active: isOwnerView,
      onClick: () => router.push("/owner"),
      show: hasOwnerRole,
    },
    {
      key: "verifier",
      label: "Verifier",
      icon: IconClipboardCheck,
      active: isVerifierView,
      onClick: () => router.push("/verifier"),
      show: hasVerifierRole,
    },
  ].filter((r) => r.show);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Switch role"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/40 bg-primary/8 text-primary text-xs font-medium hover:bg-primary/15 transition-colors"
        >
          <CurrentIcon size={12} />
          {currentLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <div className="flex flex-col">
          {roleOptions.map(({ key, label, icon: Icon, active, onClick }) => (
            <button
              key={key}
              type="button"
              onClick={onClick}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
