"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { UserContext } from "@/contexts/user-context";
import { AppHeader } from "@/components/shared/app-header";
import { MainContainer } from "@/components/shared/main-container";
import { UserSidebar } from "./user-sidebar";
import { UserBottomNav } from "./user-bottom-nav";
import { apiFetch } from "@/lib/api-client";
import { FloatingCheckinPill } from "./floating-checkin-pill";
import type { User, UserRoleEntry } from "@/shared/types/entities";

interface UserLayoutClientProps {
  children: React.ReactNode;
}

// The /users/me endpoint returns User + roles field
interface UserWithRoles extends User {
  roles: UserRoleEntry[];
}

export function UserLayoutClient({ children }: UserLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<UserRoleEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      // /checkin handles its own guest/auth branching — don't redirect
      if (pathname === "/checkin") {
        setReady(true);
        return;
      }
      router.replace("/signin");
      return;
    }

    apiFetch<UserWithRoles>("/users/me")
      .then((u) => {
        const { roles: fetchedRoles, ...userFields } = u;
        const fetchedRolesSafe = fetchedRoles ?? [];

        // Redirect pure verifiers — they have no USER dashboard content
        const hasVerifier = fetchedRolesSafe.some(
          (r) => r.role === "VERIFIER" && r.isActive,
        );
        const hasUser = fetchedRolesSafe.some(
          (r) => r.role === "USER" && r.isActive,
        );
        if (hasVerifier && !hasUser) {
          router.replace("/verifier");
          return;
        }

        setUser(userFields as User);
        setRoles(fetchedRolesSafe);
        localStorage.setItem("user_name", u.name);
      })
      .catch(() => {
        localStorage.removeItem("auth_token");
        router.replace("/signin");
      })
      .finally(() => setReady(true));
  }, [router]);

  if (!ready) return null;

  return (
    <UserContext.Provider value={{ user, roles, setUser, setRoles }}>
      <div className="min-h-screen bg-background">
        <AppHeader />
        <UserSidebar />
        <main className="pt-16 md:pl-56 pb-16 md:pb-0">
          <MainContainer>{children}</MainContainer>
        </main>
        <UserBottomNav />
        <FloatingCheckinPill />
      </div>
    </UserContext.Provider>
  );
}
