"use client";

import { IconX } from "@tabler/icons-react";

interface ActiveFilterChipsProps {
  filters: Record<string, string>;
  defaults: Record<string, string>;
  labels: Record<string, string>;
  optionLabels: Record<string, Record<string, string>>;
  onRemove: (key: string) => void;
}

export function ActiveFilterChips({
  filters,
  defaults,
  labels,
  optionLabels,
  onRemove,
}: ActiveFilterChipsProps) {
  const active = Object.entries(filters).filter(
    ([key, val]) => val && val !== (defaults[key] ?? ""),
  );

  if (active.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {active.map(([key, val]) => (
        <div
          key={key}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-primary/30 bg-primary/8 text-xs"
        >
          <span className="text-muted-foreground">{labels[key]}:</span>
          <span className="font-medium text-primary">
            {optionLabels[key]?.[val] ?? val}
          </span>
          <button
            type="button"
            onClick={() => onRemove(key)}
            className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
          >
            <IconX size={10} />
          </button>
        </div>
      ))}
    </div>
  );
}
