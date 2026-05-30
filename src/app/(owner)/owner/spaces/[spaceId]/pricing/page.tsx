"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconAlertCircle,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { TYPE_TO_FULL } from "@/lib/vehicle-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type VehicleType = "TWO_WHEELER" | "THREE_WHEELER" | "FOUR_WHEELER" | "HEAVY";
type FormulaType = "FLAT_SLAB" | "CYCLIC" | "OVERFLOW" | "CUMULATIVE";

interface PricingRule {
  pricingRuleId: string;
  vehicleType: VehicleType;
  durationFromMinutes: number;
  durationToMinutes: number | null;
  amountPaise: number;
  isActive: boolean;
}

interface PricingConfig {
  formulaType: FormulaType;
  cycleDurationHours: number | null;
  overflowIntervalMinutes: number | null;
  overflowAmountPaise: number | null;
  rules: PricingRule[];
}

interface Slab {
  localId: string;
  fromHours: string;
  toHours: string;
}

type PriceGrid = Record<string, Record<VehicleType, string>>;
type ColumnErrors = Partial<Record<VehicleType, string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_TYPES: VehicleType[] = [
  "TWO_WHEELER",
  "THREE_WHEELER",
  "FOUR_WHEELER",
  "HEAVY",
];
const VEHICLE_LABELS = TYPE_TO_FULL;

const FORMULA_OPTIONS = [
  {
    value: "FLAT_SLAB",
    label: "Flat slab",
    desc: "Last matching bracket wins.",
  },
  { value: "CYCLIC", label: "Cyclic", desc: "Brackets reset every cycle." },
  {
    value: "OVERFLOW",
    label: "Overflow",
    desc: "Slabs up to last bracket, then per-interval rate.",
  },
  {
    value: "CUMULATIVE",
    label: "Cumulative",
    desc: "Pay proportionally across tiers.",
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newSlab(): Slab {
  return { localId: crypto.randomUUID(), fromHours: "", toHours: "" };
}
function minsToHours(m: number): string {
  return String(m / 60);
}
function hoursToMins(h: string): number {
  return Math.round(parseFloat(h) * 60);
}
function paiseToRupees(p: number): string {
  return String(p / 100);
}

function formatSlabLabel(s: Slab): string {
  const from = parseFloat(s.fromHours) || 0;
  const to = s.toHours ? parseFloat(s.toHours) : null;
  if (to === null) return `${from}h+`;
  if (from === 0 && to <= 1) return `0 – ${to * 60}min`;
  return `${from}h – ${to}h`;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateGrid(slabs: Slab[], grid: PriceGrid): ColumnErrors {
  const errors: ColumnErrors = {};
  for (const vt of VEHICLE_TYPES) {
    const values = slabs.map((s) => grid[s.localId]?.[vt]?.trim() ?? "");
    const filled = values.filter((v) => v !== "").length;
    if (filled > 0 && filled < slabs.length) {
      errors[vt] = `Complete all slabs for this type or clear them all`;
    }
  }
  return errors;
}

function validateSlabSequence(slabs: Slab[]): string[] {
  return slabs.map((s, i) => {
    const from = parseFloat(s.fromHours);
    if (isNaN(from)) return "Invalid start time";

    if (i < slabs.length - 1) {
      const to = parseFloat(s.toHours);
      if (!s.toHours || isNaN(to)) return "End time required";
      if (to <= from) return "End must be after start";
      // Check continuity with next slab
      const nextFrom = parseFloat(slabs[i + 1].fromHours);
      if (
        !isNaN(nextFrom) &&
        slabs[i + 1].fromHours !== "" &&
        nextFrom !== to
      ) {
        return nextFrom < to ? "Overlaps next slab" : "Gap before next slab";
      }
    }

    if (i > 0) {
      const prevTo = parseFloat(slabs[i - 1].toHours);
      if (!isNaN(prevTo) && slabs[i - 1].toHours !== "" && from !== prevTo) {
        return from < prevTo
          ? "Overlaps previous slab"
          : "Gap from previous slab";
      }
    }

    return "";
  });
}

function hasAtLeastOneFullType(slabs: Slab[], grid: PriceGrid): boolean {
  return VEHICLE_TYPES.some(
    (vt) =>
      slabs.length > 0 &&
      slabs.every((s) => (grid[s.localId]?.[vt]?.trim() ?? "") !== ""),
  );
}

function gridToRules(slabs: Slab[], grid: PriceGrid) {
  const rules = [];
  for (const slab of slabs) {
    const fromMins = hoursToMins(slab.fromHours);
    if (isNaN(fromMins)) continue; // skip malformed slabs
    const toMins = slab.toHours ? hoursToMins(slab.toHours) : null;
    for (const vt of VEHICLE_TYPES) {
      const val = grid[slab.localId]?.[vt]?.trim();
      if (val) {
        rules.push({
          vehicleType: vt,
          durationFromMinutes: fromMins,
          durationToMinutes: toMins,
          amountPaise: Math.round(parseFloat(val) * 100),
        });
      }
    }
  }
  return rules;
}

function rulesToSlabsAndGrid(rules: PricingRule[]): {
  slabs: Slab[];
  grid: PriceGrid;
} {
  const seen = new Map<string, { fromMins: number; toMins: number | null }>();
  for (const r of rules) {
    const key = `${r.durationFromMinutes}:${r.durationToMinutes ?? ""}`;
    if (!seen.has(key))
      seen.set(key, {
        fromMins: r.durationFromMinutes,
        toMins: r.durationToMinutes ?? null,
      });
  }
  const slabs: Slab[] = [...seen.values()]
    .sort((a, b) => a.fromMins - b.fromMins)
    .map((s) => ({
      localId: crypto.randomUUID(),
      fromHours: minsToHours(s.fromMins),
      toHours: s.toMins !== null ? minsToHours(s.toMins) : "",
    }));
  const grid: PriceGrid = {};
  for (const slab of slabs) {
    grid[slab.localId] = {
      TWO_WHEELER: "",
      THREE_WHEELER: "",
      FOUR_WHEELER: "",
      HEAVY: "",
    };
    const fromMins = hoursToMins(slab.fromHours);
    const toMins = slab.toHours ? hoursToMins(slab.toHours) : null;
    for (const r of rules) {
      if (
        r.durationFromMinutes === fromMins &&
        (r.durationToMinutes ?? null) === toMins
      ) {
        grid[slab.localId][r.vehicleType] = paiseToRupees(r.amountPaise);
      }
    }
  }
  return { slabs, grid };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SpacePricingPage() {
  const { spaceId } = useParams<{ spaceId: string }>();

  const [slabs, setSlabs] = useState<Slab[]>([
    { localId: crypto.randomUUID(), fromHours: "0", toHours: "" },
  ]);
  const [grid, setGrid] = useState<PriceGrid>({});
  const [formulaType, setFormulaType] = useState<FormulaType>("FLAT_SLAB");
  const [cycleDurationHours, setCycleDurationHours] = useState("");
  const [overflowIntervalMinutes, setOverflowIntervalMinutes] = useState("");
  const [overflowAmountPaise, setOverflowAmountPaise] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [columnErrors, setColumnErrors] = useState<ColumnErrors>({});
  const [noTypeError, setNoTypeError] = useState(false);
  const [focusSlabId, setFocusSlabId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusSlabId) return;
    const input = document.querySelector<HTMLInputElement>(
      `[data-slab-to="${focusSlabId}"]`,
    );
    input?.focus();
    setFocusSlabId(null);
  }, [focusSlabId]);

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    apiFetch<PricingConfig>(`/spaces/${spaceId}/pricing`)
      .then((data) => {
        if (data.rules && data.rules.length > 0) {
          const { slabs: loadedSlabs, grid: loadedGrid } = rulesToSlabsAndGrid(
            data.rules,
          );
          setSlabs(loadedSlabs);
          setGrid(loadedGrid);
        } else {
          const initial = {
            localId: crypto.randomUUID(),
            fromHours: "0",
            toHours: "",
          };
          setSlabs([initial]);
          setGrid({
            [initial.localId]: {
              TWO_WHEELER: "",
              THREE_WHEELER: "",
              FOUR_WHEELER: "",
              HEAVY: "",
            },
          });
        }
        setFormulaType(data.formulaType ?? "FLAT_SLAB");
        setCycleDurationHours(
          data.cycleDurationHours ? String(data.cycleDurationHours) : "",
        );
        setOverflowIntervalMinutes(
          data.overflowIntervalMinutes
            ? String(data.overflowIntervalMinutes)
            : "",
        );
        setOverflowAmountPaise(
          data.overflowAmountPaise
            ? paiseToRupees(data.overflowAmountPaise)
            : "",
        );
      })
      .catch(() => showToast("Failed to load pricing.", "error"))
      .finally(() => setLoading(false));
  }, [spaceId]);

  // ── Slab helpers ─────────────────────────────────────────────────────────

  function addSlab() {
    const last = slabs[slabs.length - 1];
    const lastTo = parseFloat(last.toHours);
    const lastFrom = parseFloat(last.fromHours);
    if (!last.toHours || isNaN(lastTo)) {
      showToast("Fill the end time on the current last slab first.", "error");
      return;
    }
    if (lastTo <= lastFrom) {
      showToast("End time must be after start time.", "error");
      return;
    }
    const slab: Slab = {
      localId: crypto.randomUUID(),
      fromHours: last.toHours,
      toHours: "",
    };
    setSlabs((prev) => [...prev, slab]);
    setGrid((prev) => ({
      ...prev,
      [slab.localId]: {
        TWO_WHEELER: "",
        THREE_WHEELER: "",
        FOUR_WHEELER: "",
        HEAVY: "",
      },
    }));
    setFocusSlabId(slab.localId);
  }

  function removeSlab(localId: string) {
    setSlabs((prev) => prev.filter((s) => s.localId !== localId));
    setGrid((prev) => {
      const next = { ...prev };
      delete next[localId];
      return next;
    });
  }

  function updateSlab(
    localId: string,
    field: "fromHours" | "toHours",
    value: string,
  ) {
    setSlabs((prev) =>
      prev.map((s) => (s.localId === localId ? { ...s, [field]: value } : s)),
    );
  }

  // ── Grid cell update ──────────────────────────────────────────────────────

  function updateCell(slabId: string, vt: VehicleType, value: string) {
    setGrid((prev) => ({
      ...prev,
      [slabId]: { ...prev[slabId], [vt]: value },
    }));
    setColumnErrors((prev) => {
      const next = { ...prev };
      delete next[vt];
      return next;
    });
    setNoTypeError(false);
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    const seqErrors = validateSlabSequence(slabs);
    if (seqErrors.some((e) => e !== "")) {
      showToast("Fix slab time sequence errors before saving.", "error");
      return;
    }

    const errors = validateGrid(slabs, grid);
    setColumnErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (!hasAtLeastOneFullType(slabs, grid)) {
      setNoTypeError(true);
      return;
    }
    setNoTypeError(false);

    // Client-side formula config validation with friendly messages
    if (formulaType === "CYCLIC") {
      const cd = parseFloat(cycleDurationHours);
      if (!cycleDurationHours || isNaN(cd) || cd <= 0) {
        showToast("Cycle duration must be greater than 0 hours.", "error");
        return;
      }
    }
    if (formulaType === "OVERFLOW") {
      const oi = parseInt(overflowIntervalMinutes);
      const oa = parseFloat(overflowAmountPaise);
      if (!overflowIntervalMinutes || isNaN(oi) || oi < 1) {
        showToast("Enter the overtime interval in minutes (e.g. 60).", "error");
        return;
      }
      if (!overflowAmountPaise || isNaN(oa) || oa < 0) {
        showToast(
          "Enter the rate charged per overtime interval (e.g. 20).",
          "error",
        );
        return;
      }
    }

    setSaving(true);
    try {
      const rules = gridToRules(slabs, grid);
      await apiFetch(`/spaces/${spaceId}/pricing`, {
        method: "PUT",
        body: JSON.stringify({
          formulaType,
          rules,
          cycleDurationHours: cycleDurationHours
            ? parseFloat(cycleDurationHours)
            : null,
          overflowIntervalMinutes: overflowIntervalMinutes
            ? parseInt(overflowIntervalMinutes)
            : null,
          overflowAmountPaise: overflowAmountPaise
            ? Math.round(parseFloat(overflowAmountPaise) * 100)
            : null,
        }),
      });
      showToast("Pricing saved successfully.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("VALIDATION")) {
        showToast(
          "Some values look incorrect. Check that all slabs and rates are properly filled in.",
          "error",
        );
      } else if (msg.includes("FORBIDDEN") || msg.includes("UNAUTHORIZED")) {
        showToast(
          "You don't have permission to update pricing for this space.",
          "error",
        );
      } else {
        showToast(msg || "Couldn't save pricing. Please try again.", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  const slabErrors = validateSlabSequence(slabs);
  const hasSlabErrors = slabErrors.some((e) => e !== "");
  const hasErrors =
    Object.keys(columnErrors).length > 0 || noTypeError || hasSlabErrors;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/owner/spaces/${spaceId}`}>
          <IconArrowLeft size={16} className="mr-1" /> Back to space
        </Link>
      </Button>

      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
          Pricing
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Define time slabs then set rates per vehicle type.
        </p>
      </div>

      {/* ── STEP 1: Slab Builder ─────────────────────────────────────────── */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
            1
          </span>
          <p className="text-sm font-semibold text-foreground">
            Define time slabs
          </p>
        </div>

        <Card>
          <CardContent className="pt-4 pb-3 px-4 space-y-2">
            {/* Column headers */}
            {slabs.length > 0 && (
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1 mb-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  From (hrs)
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  To (hrs)
                </p>
                <div className="w-8" />
              </div>
            )}

            {/* Slab rows */}
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-9 rounded-lg bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <>
                {slabs.map((slab, idx) => (
                  <div
                    key={slab.localId}
                    className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start"
                  >
                    <div className="space-y-1">
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="0"
                        value={slab.fromHours}
                        readOnly={idx === 0}
                        onChange={(e) =>
                          idx !== 0 &&
                          updateSlab(slab.localId, "fromHours", e.target.value)
                        }
                        className={cn(
                          "h-9 text-sm",
                          idx === 0 ? "opacity-50 cursor-default" : "",
                          slabErrors[idx] ? "border-destructive/50" : "",
                        )}
                      />
                      {slabErrors[idx] && (
                        <p className="text-[10px] text-destructive leading-tight">
                          {slabErrors[idx]}
                        </p>
                      )}
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder={
                        idx === slabs.length - 1 ? "∞ open-ended" : "required"
                      }
                      value={slab.toHours}
                      data-slab-to={slab.localId}
                      onChange={(e) =>
                        updateSlab(slab.localId, "toHours", e.target.value)
                      }
                      className="h-9 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeSlab(slab.localId)}
                      disabled={slabs.length === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                ))}
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 mt-1"
              onClick={addSlab}
              disabled={loading}
            >
              <IconPlus size={13} /> Add slab
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* ── STEP 2: Formula + Price Grid ─────────────────────────────────── */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
            2
          </span>
          <p className="text-sm font-semibold text-foreground">Set rates</p>
        </div>

        {/* Formula selector */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Billing formula
          </p>
          <div className="grid grid-cols-2 gap-2">
            {FORMULA_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFormulaType(opt.value)}
                className={cn(
                  "text-left p-3 rounded-xl border transition-colors",
                  formulaType === opt.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <p
                  className={cn(
                    "text-sm font-semibold",
                    formulaType === opt.value
                      ? "text-primary"
                      : "text-foreground",
                  )}
                >
                  {opt.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                  {opt.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Formula-specific config */}
        {formulaType === "CYCLIC" && (
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 border border-border px-4 py-3">
            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Cycle duration (hrs)
            </label>
            <Input
              type="number"
              min="1"
              step="1"
              placeholder="24"
              value={cycleDurationHours}
              onChange={(e) => setCycleDurationHours(e.target.value)}
              className="h-9 text-sm max-w-[100px]"
            />
          </div>
        )}

        {formulaType === "OVERFLOW" && (
          <div className="rounded-xl bg-muted/40 border border-border px-4 py-3 space-y-3">
            <p className="text-xs font-semibold text-foreground">
              After last bracket ends, charge per interval:
            </p>
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground whitespace-nowrap">
                Every (mins)
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                placeholder="60"
                value={overflowIntervalMinutes}
                onChange={(e) => setOverflowIntervalMinutes(e.target.value)}
                className="h-9 text-sm max-w-[100px]"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground whitespace-nowrap">
                Rate per interval (₹)
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="20"
                value={overflowAmountPaise}
                onChange={(e) => setOverflowAmountPaise(e.target.value)}
                className="h-9 text-sm max-w-[100px]"
              />
            </div>
          </div>
        )}

        {formulaType === "CUMULATIVE" && (
          <div className="rounded-xl bg-muted/40 border border-border px-4 py-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Amount = cost if the full bracket is consumed. Partial time is
              prorated automatically. All brackets must have an end time.
            </p>
          </div>
        )}

        {/* Global error banner */}
        {noTypeError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
            <IconAlertCircle
              size={14}
              className="text-destructive mt-0.5 shrink-0"
            />
            <p className="text-xs text-destructive">
              At least one vehicle type must be fully priced
            </p>
          </div>
        )}

        {/* Price grid */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {/* Slab column header */}
                  <th
                    scope="col"
                    className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap w-[120px]"
                  >
                    Slab
                  </th>
                  {/* Vehicle type column headers */}
                  {VEHICLE_TYPES.map((vt) => (
                    <th
                      key={vt}
                      scope="col"
                      className="px-3 py-3 text-center min-w-[120px]"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {VEHICLE_LABELS[vt]}
                      </p>
                      {columnErrors[vt] && (
                        <p className="text-[10px] text-destructive font-normal normal-case tracking-normal mt-0.5 leading-tight">
                          {columnErrors[vt]}
                        </p>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Skeleton rows
                  [1, 2, 3].map((i) => (
                    <tr
                      key={i}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                      </td>
                      {VEHICLE_TYPES.map((vt) => (
                        <td key={vt} className="px-3 py-2.5">
                          <div className="h-9 rounded-lg bg-muted animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : slabs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={VEHICLE_TYPES.length + 1}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      Add slabs in Step 1 to configure rates
                    </td>
                  </tr>
                ) : (
                  slabs.map((slab) => (
                    <tr
                      key={slab.localId}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      {/* Slab label */}
                      <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {formatSlabLabel(slab)}
                      </td>
                      {/* Price cells */}
                      {VEHICLE_TYPES.map((vt) => (
                        <td
                          key={vt}
                          className={cn(
                            "px-3 py-2",
                            columnErrors[vt] ? "bg-destructive/3" : "",
                          )}
                        >
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs select-none">
                              ₹
                            </span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="–"
                              value={grid[slab.localId]?.[vt] ?? ""}
                              onChange={(e) =>
                                updateCell(slab.localId, vt, e.target.value)
                              }
                              disabled={hasSlabErrors}
                              className={cn(
                                "h-9 text-sm pl-6 text-center",
                                columnErrors[vt]
                                  ? "border-destructive/50 focus-visible:ring-destructive/30"
                                  : "",
                                hasSlabErrors
                                  ? "opacity-40 cursor-not-allowed"
                                  : "",
                              )}
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      {/* Save */}
      <Button
        className="w-full h-12"
        disabled={saving || loading || hasErrors}
        onClick={handleSave}
      >
        {saving ? "Saving…" : "Save pricing"}
      </Button>
    </div>
  );
}
