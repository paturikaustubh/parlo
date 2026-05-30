"use client";

import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/user-context";
import { apiFetch } from "@/lib/api-client";
import {
  IconUser,
  IconBuildingStore,
  IconLogout,
  IconMoon,
  IconSun,
} from "@tabler/icons-react";

export default function OwnerSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const router = useRouter();

  async function handleLogout() {
    try {
      await apiFetch("/auth/tokens/me", { method: "DELETE" });
    } catch {
      /* proceed */
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_name");
    router.push("/");
  }

  return (
    <div className="space-y-6 max-w-sm mx-auto">
      <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
        Settings
      </h1>

      {/* Profile */}
      <section className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Account
        </p>
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border bg-card">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <IconUser size={16} className="text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Name</p>
              <p className="text-sm font-medium text-foreground">
                {user?.name ?? "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <IconBuildingStore
              size={16}
              className="text-muted-foreground shrink-0"
            />
            <div>
              <p className="text-[10px] text-muted-foreground">Role</p>
              <p className="text-sm font-medium text-foreground">
                Business Owner
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
          Preferences
        </p>
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-2">
              {theme === "dark" ? (
                <IconMoon size={16} className="text-muted-foreground" />
              ) : (
                <IconSun size={16} className="text-muted-foreground" />
              )}
              <label
                htmlFor="owner-dark-switch"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Dark mode
              </label>
            </div>
            <Switch
              id="owner-dark-switch"
              checked={theme === "dark"}
              onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
            />
          </div>
        </div>
      </section>

      <Separator />

      <Button
        variant="ghost"
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 justify-start gap-2"
        onClick={handleLogout}
      >
        <IconLogout size={16} /> Sign out
      </Button>
    </div>
  );
}
