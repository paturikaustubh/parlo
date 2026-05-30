"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { pageFetcher } from "@/lib/swr-fetcher";
import { LotView } from "@/components/shared/lot-view";
import {
  FilterDialog,
  type FilterField,
} from "@/components/shared/filter-dialog";
import { ActiveFilterChips } from "@/components/shared/active-filter-chips";
import { formatAmount, VEHICLE_TYPE_OPTIONS } from "@/lib/vehicle-utils";
import type { ParkingSession, Space } from "@/shared/types/entities";

interface PagedSessions {
  data: ParkingSession[];
}

function estTotal(arr: ParkingSession[]): number {
  return arr.reduce((sum, s) => {
    const est = (s as { estimatedAmountPaise?: number | null })
      .estimatedAmountPaise;
    return sum + (est ?? 0);
  }, 0);
}

export default function OwnerLotPage() {
  const searchParams = useSearchParams();
  const [spaceId, setSpaceId] = useState(() => searchParams.get("space") ?? "");
  const [vehicleType, setVehicleType] = useState("");

  const { data: spacesData } = useSWR<Space[]>(["/spaces"], pageFetcher);
  const spaces = spacesData ?? [];

  // Always fetch all spaces — filter client-side so both totals are available
  const { data, isLoading } = useSWR<PagedSessions>(
    ["/owner/sessions", { status: "ACTIVE", pageSize: 100 }],
    pageFetcher,
  );

  const allSessions = data?.data ?? [];
  const filtered = !spaceId
    ? allSessions
    : allSessions.filter((s) => s.spaceId === spaceId);

  const allEst = estTotal(allSessions);
  const filteredEst = estTotal(filtered);
  const isFiltered = !!spaceId;

  return (
    <div className="space-y-4">
      <div>
        <div>
          <h1 className="font-heading font-bold text-xl text-foreground tracking-tight">
            Parked Now
          </h1>
          <div className="mt-0.5 space-y-0.5">
            {/* Filtered-space row (only when a space is selected) */}
            {isFiltered && (
              <p className="text-sm text-muted-foreground">
                {filtered.length} vehicle{filtered.length !== 1 ? "s" : ""}
                {filteredEst > 0 && (
                  <>
                    {" · Est. "}
                    <span className="text-primary font-medium">
                      {formatAmount(filteredEst)}
                    </span>
                  </>
                )}
                <span className="text-muted-foreground/50"> in this space</span>
              </p>
            )}
            {/* All-spaces row (always) */}
            <p
              className={
                isFiltered
                  ? "text-xs text-muted-foreground/70"
                  : "text-sm text-muted-foreground"
              }
            >
              {allSessions.length} vehicle
              {allSessions.length !== 1 ? "s" : ""}
              {allEst > 0 && (
                <>
                  {" · Est. "}
                  <span
                    className={
                      isFiltered
                        ? "text-primary/70 font-medium"
                        : "text-primary font-medium"
                    }
                  >
                    {formatAmount(allEst)}
                  </span>
                </>
              )}
              {isFiltered && (
                <span className="text-muted-foreground/50">
                  {" "}
                  across all spaces
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <LotView
        sessions={filtered}
        loading={isLoading}
        vehicleTypeFilter={vehicleType}
        filterSlot={
          spaces.length > 0 ? (
            <div className="space-y-2">
              <FilterDialog
                fields={[
                  {
                    key: "spaceId",
                    label: "Space",
                    defaultValue: "",
                    options: [
                      ...spaces.map((s) => ({
                        label: s.name,
                        value: s.spaceId,
                      })),
                    ],
                    className: "col-span-1",
                  },
                  {
                    key: "vehicleType",
                    label: "Vehicle type",
                    defaultValue: "",
                    options: [...VEHICLE_TYPE_OPTIONS],
                    className: "col-span-1",
                  },
                ]}
                values={{ spaceId, vehicleType }}
                onApply={(vals) => {
                  setSpaceId(vals.spaceId ?? "");
                  setVehicleType(vals.vehicleType ?? "");
                }}
              />
              <ActiveFilterChips
                filters={{ spaceId, vehicleType }}
                defaults={{ spaceId: "", vehicleType: "" }}
                labels={{ spaceId: "Space", vehicleType: "Type" }}
                optionLabels={{
                  spaceId: Object.fromEntries(
                    spaces.map((s) => [s.spaceId, s.name]),
                  ),
                  vehicleType: Object.fromEntries(
                    VEHICLE_TYPE_OPTIONS.map((o) => [o.value, o.label]),
                  ),
                }}
                onRemove={(key) => {
                  if (key === "spaceId") setSpaceId("");
                  if (key === "vehicleType") setVehicleType("");
                }}
              />
            </div>
          ) : undefined
        }
      />
    </div>
  );
}
