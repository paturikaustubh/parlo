"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StaffSidebar } from "./staff-sidebar";
import { StaffBottomNav } from "./staff-bottom-nav";
import { AppHeader } from "../shared/app-header";
import { SubscriptionExpiryBanner } from "@/components/shared/subscription-expiry-banner";
import { StaffContext } from "@/contexts/staff-context";
import { StaffExpiryContext } from "@/contexts/staff-expiry-context";
import { useSubscriptionExpiry } from "@/hooks/use-subscription-expiry";
import { apiFetch } from "@/lib/api-client";
import type { StaffMember } from "@/shared/types/entities";

function StaffLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/signin");
      return;
    }

    apiFetch<StaffMember>("/staff-members/me")
      .then((sm) => {
        setStaffMember(sm);
      })
      .catch(() => router.replace("/signin"))
      .finally(() => setReady(true));
  }, [router]);

  const { isExpired } = useSubscriptionExpiry(
    ready && staffMember?.businessId ? staffMember.businessId : undefined,
  );

  if (!ready) return null;

  return (
    <StaffContext.Provider value={{ staffMember, setStaffMember }}>
      <StaffExpiryContext.Provider value={{ isExpired }}>
        <div className="min-h-screen bg-background pb-20 md:pb-0">
          <AppHeader />
          <div className="flex">
            <StaffSidebar />
            <main className="flex-1 md:pl-56 pt-16">
              <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
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
  );
}

export function StaffLayoutClient({ children }: { children: React.ReactNode }) {
  return <StaffLayoutInner>{children}</StaffLayoutInner>;
}
