"use client";

import { useState } from "react";
import useSWR from "swr";
import { pageFetcher } from "@/lib/swr-fetcher";
import { LotView } from "@/components/shared/lot-view";
import {
  FilterDialog,
  type FilterField,
} from "@/components/shared/filter-dialog";
import { ActiveFilterChips } from "@/components/shared/active-filter-chips";
import { useStaff } from "@/contexts/staff-context";
import { formatAmount, VEHICLE_TYPE_OPTIONS } from "@/lib/vehicle-utils";
import type { ParkingSession } from "@/shared/types/entities";

interface SpaceSessions {
  data?: ParkingSession[];
}

export default function StaffVehiclesPage() {
  const { staffMember } = useStaff();
  const [vehicleType, setVehicleType] = useState("");

  const { data, isLoading } = useSWR<SpaceSessions | ParkingSession[]>(
    staffMember ? ["/staff/me/space-sessions", { status: "ACTIVE" }] : null,
    pageFetcher,
  );

  const sessions: ParkingSession[] = Array.isArray(data)
    ? data
    : (data?.data ?? []);

  const estTotal = sessions.reduce((sum, s) => {
    const est = (s as { estimatedAmountPaise?: number | null })
      .estimatedAmountPaise;
    return sum + (est ?? 0);
  }, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading font-bold text-xl text-foreground tracking-tight">
          Parked Now
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {sessions.length} vehicle{sessions.length !== 1 ? "s" : ""}
          {estTotal > 0 && (
            <>
              {" · Est. "}
              <span className="text-primary font-medium">
                {formatAmount(estTotal)}
              </span>
            </>
          )}
        </p>
      </div>
      <LotView
        sessions={sessions}
        loading={isLoading}
        vehicleTypeFilter={vehicleType}
        filterSlot={
          <div className="space-y-2">
            <FilterDialog
              fields={[
                {
                  key: "vehicleType",
                  label: "Vehicle type",
                  defaultValue: "",
                  options: [...VEHICLE_TYPE_OPTIONS],
                },
              ]}
              values={{ vehicleType }}
              onApply={(vals) => setVehicleType(vals.vehicleType ?? "")}
            />
            <ActiveFilterChips
              filters={{ vehicleType }}
              defaults={{ vehicleType: "" }}
              labels={{ vehicleType: "Type" }}
              optionLabels={{
                vehicleType: Object.fromEntries(
                  VEHICLE_TYPE_OPTIONS.map((o) => [o.value, o.label]),
                ),
              }}
              onRemove={() => setVehicleType("")}
            />
          </div>
        }
      />
    </div>
  );
}
