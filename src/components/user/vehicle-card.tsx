import { cn } from "@/lib/utils";
import {
  IconCar,
  IconMotorbike,
  IconTruck,
  IconPlus,
} from "@tabler/icons-react";

interface VehicleCardProps {
  plate?: string;
  type?: string;
  selected?: boolean;
  isAdd?: boolean;
  onClick: () => void;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  car: IconCar,
  motorcycle: IconMotorbike,
  scooter: IconMotorbike,
  "three-wheeler": IconTruck,
  default: IconCar,
};

export function VehicleCard({
  plate,
  type,
  selected,
  isAdd,
  onClick,
}: VehicleCardProps) {
  if (isAdd) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[110px] text-muted-foreground hover:text-primary"
      >
        <IconPlus size={22} strokeWidth={1.5} />
        <span className="text-xs font-medium">Add vehicle</span>
      </button>
    );
  }

  const Icon = TYPE_ICONS[(type ?? "").toLowerCase()] ?? TYPE_ICONS.default;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected ?? false}
      aria-label={`${type ?? ""}, ${plate ?? ""}${selected ? ", selected" : ""}`}
      className={cn(
        "flex flex-col items-start gap-2 p-4 rounded-2xl border-2 transition-all min-h-[110px] text-left relative",
        selected
          ? "border-primary bg-primary/8"
          : "border-border hover:border-primary/30 hover:bg-muted/50",
      )}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon size={18} />
      </div>
      <div>
        <p className="font-mono font-bold text-sm text-foreground tracking-wider leading-none">
          {plate}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1 capitalize">
          {type}
        </p>
      </div>
      {selected && (
        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path
              d="M1.5 4L3 5.5L6.5 2.5"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </button>
  );
}
