"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserContext } from "@/contexts/user-context";
import { AppHeader } from "@/components/shared/app-header";
import { MainContainer } from "@/components/shared/main-container";
import { VerifierSidebar } from "./verifier-sidebar";
import { VerifierBottomNav } from "./verifier-bottom-nav";
import { apiFetch } from "@/lib/api-client";
import type { User, UserRoleEntry } from "@/shared/types/entities";

interface UserWithRoles extends User {
  roles: UserRoleEntry[];
}

export function VerifierLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<UserRoleEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/signin");
      return;
    }

    apiFetch<UserWithRoles>("/users/me")
      .then((u) => {
        const { roles: fetchedRoles, ...userFields } = u;
        const hasVerifier = (fetchedRoles ?? []).some(
          (r: UserRoleEntry) => r.role === "VERIFIER" && r.isActive,
        );
        if (!hasVerifier) {
          router.replace("/dashboard");
          return;
        }
        setUser(userFields as User);
        setRoles(fetchedRoles ?? []);
        localStorage.setItem("user_name", u.name);
      })
      .catch(() => router.replace("/signin"))
      .finally(() => setReady(true));
  }, [router]);

  if (!ready) return null;

  return (
    <UserContext.Provider value={{ user, roles, setUser, setRoles }}>
      <div className="min-h-screen bg-background">
        <AppHeader />
        <VerifierSidebar />
        <main className="pt-16 md:pl-56 pb-16 md:pb-0">
          <MainContainer>{children}</MainContainer>
        </main>
        <VerifierBottomNav />
      </div>
    </UserContext.Provider>
  );
}
