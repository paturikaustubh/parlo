"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterField {
  key: string;
  label: string;
  type?: "select" | "date";
  options?: FilterOption[];
  defaultValue?: string;
  className?: string;
}

interface FilterDialogProps {
  fields: FilterField[];
  values: Record<string, string>;
  onApply: (values: Record<string, string>) => void;
  className?: string;
}

export function FilterDialog({
  fields,
  values,
  onApply,
  className,
}: FilterDialogProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(values);

  function handleOpen() {
    setDraft({ ...values });
    setOpen(true);
  }

  function handleApply() {
    onApply(draft);
    setOpen(false);
  }

  function handleReset() {
    const defaults = Object.fromEntries(
      fields.map((f) => [f.key, f.defaultValue ?? ""]),
    );
    onApply(defaults);
    setOpen(false);
  }

  const activeCount = fields.filter((f) => {
    const def = f.defaultValue ?? "";
    return (values[f.key] ?? "") !== def && (values[f.key] ?? "") !== "";
  }).length;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "relative flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors shrink-0",
          activeCount > 0 && "border-primary/40 text-primary bg-primary/8",
          className,
        )}
      >
        <IconAdjustmentsHorizontal size={14} />
        Filters
        {activeCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4 py-1">
            {fields.map((field) => (
              <div
                key={field.key}
                className={cn("space-y-1.5", field.className || "col-span-2")}
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {field.label}
                </p>
                {field.type === "date" ? (
                  <Input
                    type="date"
                    value={draft[field.key] ?? ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="h-9 text-xs w-full"
                  />
                ) : (
                  <Select
                    value={draft[field.key] || undefined}
                    onValueChange={(v) =>
                      setDraft((prev) => ({ ...prev, [field.key]: v }))
                    }
                  >
                    <SelectTrigger className="h-9 text-xs w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset
            </Button>
            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
