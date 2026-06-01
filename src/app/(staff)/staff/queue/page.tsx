"use client";

import { useStaff } from "@/contexts/staff-context";
import { useStaffExpiry } from "@/contexts/staff-expiry-context";
import { SpaceOperationsPanel } from "@/components/shared/space-operations-panel";

export default function StaffQueuePage() {
  const { staffMember } = useStaff();
  const { isExpired } = useStaffExpiry();

  return (
    <div className="space-y-5">
      <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
        Queue
      </h1>

      {staffMember?.spaceId ? (
        <SpaceOperationsPanel
          spaceId={staffMember.spaceId}
          selfUserId={staffMember.user.userId}
          isOnDuty={staffMember.isOnDuty}
          isExpired={isExpired}
        />
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">
          No space assigned — contact your owner to assign a space.
        </p>
      )}
    </div>
  );
}
