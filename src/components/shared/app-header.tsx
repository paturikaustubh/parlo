"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  IconSettings,
  IconLogout,
  IconSun,
  IconMoon,
} from "@tabler/icons-react";
import { useUser } from "@/contexts/user-context";
import { apiFetch } from "@/lib/api-client";
import { RoleChip } from "@/components/shared/role-chip";
import { OwnerDemoChip } from "@/components/owner/owner-demo-chip";
import { StaffSpaceChip } from "@/components/staff/staff-space-chip";

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { user } = useUser();

  const dashboardHref = pathname.startsWith("/owner")
    ? "/owner"
    : pathname.startsWith("/staff")
      ? "/staff"
      : pathname.startsWith("/verifier")
        ? "/verifier"
        : "/dashboard";

  async function handleLogout() {
    try {
      await apiFetch("/auth/tokens/me", { method: "DELETE" });
    } catch {
      // proceed regardless
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_name");
    router.push("/");
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 bg-background border-b border-border flex items-center justify-between px-4 md:px-6">
      <Link href={dashboardHref} className="flex items-center gap-2.5 group">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center font-heading font-bold text-sm text-primary-foreground transition-transform group-hover:scale-105">
          P
        </div>
        <span className="font-heading font-bold text-base text-foreground tracking-tight">
          parlo
        </span>
      </Link>

      <div className="flex items-center gap-2">
        {pathname.startsWith("/staff") && <StaffSpaceChip />}
        {pathname.startsWith("/owner") && <OwnerDemoChip />}
        <RoleChip />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Open account menu"
              className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-heading hover:bg-primary/20 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link href="/account" className="flex items-center gap-2">
                <IconSettings size={15} />
                Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
              className="flex items-center gap-2 cursor-pointer"
            >
              {resolvedTheme === "dark" ? (
                <IconSun size={15} />
              ) : (
                <IconMoon size={15} />
              )}
              {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
            >
              <IconLogout size={15} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
