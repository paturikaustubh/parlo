import type { ComponentType } from "react";
import type { VehicleType } from "@/shared/types/enums";
import { IconCar, IconMotorbike, IconTruck } from "@tabler/icons-react";

// ── Type mapping ──────────────────────────────────────────────────────────────

/** Maps UI select values → API VehicleType enum */
export const DISPLAY_TO_TYPE: Record<string, VehicleType> = {
  "2-Wheeler": "TWO_WHEELER",
  "3-Wheeler": "THREE_WHEELER",
  "4-Wheeler": "FOUR_WHEELER",
  Heavy: "HEAVY",
  // Legacy
  Car: "FOUR_WHEELER",
  Motorcycle: "TWO_WHEELER",
  Scooter: "TWO_WHEELER",
  "Three-wheeler": "THREE_WHEELER",
  Other: "HEAVY",
};

/** Maps API VehicleType enum → Full Label */
export const TYPE_TO_FULL: Record<VehicleType, string> = {
  TWO_WHEELER: "2-Wheeler",
  THREE_WHEELER: "3-Wheeler",
  FOUR_WHEELER: "4-Wheeler",
  HEAVY: "Heavy",
};

/** Maps API VehicleType enum → Short Label */
export const TYPE_TO_SHORT: Record<VehicleType, string> = {
  TWO_WHEELER: "2W",
  THREE_WHEELER: "3W",
  FOUR_WHEELER: "4W",
  HEAVY: "HV",
};

/** Maps API VehicleType enum → human label (Default to Full) */
export const TYPE_TO_DISPLAY = TYPE_TO_FULL;

/** Vehicle type options for <Select> dropdowns */
export const VEHICLE_TYPE_OPTIONS = [
  { label: "2-Wheeler", value: "TWO_WHEELER" },
  { label: "3-Wheeler", value: "THREE_WHEELER" },
  { label: "4-Wheeler", value: "FOUR_WHEELER" },
  { label: "Heavy", value: "HEAVY" },
] as const;

/** Icon component lookup by API VehicleType */
export const VEHICLE_ICONS: Record<
  VehicleType,
  ComponentType<{ size?: number; className?: string }>
> = {
  FOUR_WHEELER: IconCar,
  TWO_WHEELER: IconMotorbike,
  THREE_WHEELER: IconTruck,
  HEAVY: IconTruck,
};

// ── Formatters ────────────────────────────────────────────────────────────────

/** Convert paise → "₹70" or "₹1,40,000" using Indian locale formatting */
export function formatAmount(paise: number | null | undefined): string {
  if (paise == null) return "₹0";
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/** Convert minutes → "2h 15m" or "45m" */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** ISO timestamp → "Apr 9" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
}

/** ISO timestamp → "10:30 AM" */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
