"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StaffSidebar } from "./staff-sidebar";
import { StaffBottomNav } from "./staff-bottom-nav";
import { AppHeader } from "../shared/app-header";
import { SubscriptionExpiryBanner } from "@/components/shared/subscription-expiry-banner";
import { MainContainer } from "@/components/shared/main-container";
import { StaffContext } from "@/contexts/staff-context";
import { StaffExpiryContext } from "@/contexts/staff-expiry-context";
import { UserContext } from "@/contexts/user-context";
import { useSubscriptionExpiry } from "@/hooks/use-subscription-expiry";
import { apiFetch } from "@/lib/api-client";
import type { StaffMember, User, UserRoleEntry } from "@/shared/types/entities";

interface UserWithRoles extends User {
  roles: UserRoleEntry[];
}

function StaffLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<UserRoleEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/signin");
      return;
    }

    Promise.all([
      apiFetch<StaffMember>("/staff/me"),
      apiFetch<UserWithRoles>("/users/me"),
    ])
      .then(([sm, u]) => {
        setStaffMember(sm);
        const { roles: fetchedRoles, ...userFields } = u;
        setUser(userFields as User);
        setRoles(fetchedRoles ?? []);
        localStorage.setItem("user_name", u.name);
      })
      .catch(() => router.replace("/signin"))
      .finally(() => setReady(true));
  }, [router]);

  const { isExpired } = useSubscriptionExpiry(
    ready && staffMember?.businessId ? staffMember.businessId : undefined,
  );

  if (!ready) return null;

  return (
    <UserContext.Provider value={{ user, roles, setUser, setRoles }}>
      <StaffContext.Provider value={{ staffMember, setStaffMember }}>
        <StaffExpiryContext.Provider value={{ isExpired }}>
          <div className="min-h-screen bg-background pb-20 md:pb-0">
            <AppHeader />
            <div className="flex">
              <StaffSidebar />
              <main className="flex-1 md:pl-56 pt-16">
                <MainContainer>{children}</MainContainer>
              </main>
            </div>
            <SubscriptionExpiryBanner
              businessId={staffMember?.businessId ?? undefined}
              planHref="/staff/profile"
            />
            <StaffBottomNav />
          </div>
        </StaffExpiryContext.Provider>
      </StaffContext.Provider>
    </UserContext.Provider>
  );
}

export function StaffLayoutClient({ children }: { children: React.ReactNode }) {
  return <StaffLayoutInner>{children}</StaffLayoutInner>;
}
