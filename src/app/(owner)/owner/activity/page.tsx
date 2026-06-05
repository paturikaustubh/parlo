"use client";

import { useEffect, useState, Suspense } from "react";
import { smartTime } from "@/lib/time";
import { useTimeFormat } from "@/hooks/use-time-format";
import useSWR from "swr";
import { pageFetcher } from "@/lib/swr-fetcher";
import { usePaginationParams } from "@/lib/use-pagination-params";
import { Pagination } from "@/components/shared/pagination";
import {
  IconActivity,
  IconLogin,
  IconLogout,
  IconSettings,
  IconUsers,
  IconCreditCard,
  IconLoader2,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { SpaceFilterBanner } from "@/components/owner/space-filter-banner";
import type { Space } from "@/shared/types/entities";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditEntry {
  auditId: string;
  actorName: string;
  spaceName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface PaginatedAudit {
  data: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  lastPage: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTER_TABS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "checkins", label: "Check-ins" },
  { key: "staff", label: "Staff" },
  { key: "settings", label: "Settings" },
  { key: "overrides", label: "Overrides" },
];

const ACTION_ICONS: Record<string, React.ElementType> = {
  CHECK_IN: IconLogin,
  CHECK_OUT: IconLogout,
  STAFF_INVITE: IconUsers,
  STAFF_APPROVE: IconUsers,
  AMOUNT_OVERRIDE: IconCreditCard,
  SPACE_UPDATE: IconSettings,
  default: IconActivity,
};

const ACTION_LABELS: Record<string, string> = {
  CHECK_IN: "Check-in",
  CHECK_OUT: "Check-out",
  STAFF_INVITE: "Staff invited",
  STAFF_APPROVE: "Staff approved",
  AMOUNT_OVERRIDE: "Amount overridden",
  SPACE_UPDATE: "Space updated",
};

const DOT_COLOR: Record<string, string> = {
  CHECK_IN: "bg-emerald-500",
  CHECK_OUT: "bg-destructive",
  AMOUNT_OVERRIDE: "bg-primary",
  STAFF_INVITE: "bg-blue-400",
  STAFF_APPROVE: "bg-blue-400",
  SPACE_UPDATE: "bg-muted-foreground",
  default: "bg-muted-foreground",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function groupLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const entryDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (entryDay.getTime() === today.getTime()) return "Today";
  if (entryDay.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function contextChip(entry: AuditEntry): string {
  const m = entry.metadata as Record<string, unknown> | null;
  switch (entry.action) {
    case "CHECK_IN":
    case "CHECK_OUT":
      return [m?.vehicleNumber, entry.spaceName].filter(Boolean).join(" · ");
    case "AMOUNT_OVERRIDE":
      if (m?.original !== undefined && m?.final !== undefined)
        return `₹${m.original} → ₹${m.final}`;
      return entry.spaceName ?? entry.entityType;
    case "STAFF_INVITE":
    case "STAFF_APPROVE":
      return String(m?.targetName ?? entry.entityId.slice(0, 8) + "…");
    case "SPACE_UPDATE":
      return entry.spaceName ?? entry.entityType;
    default:
      return entry.entityType;
  }
}

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function ActivityInner() {
  const { use12 } = useTimeFormat();
  const { get, getInt, setParam } = usePaginationParams();
  const page = getInt("page", 1);
  const pageSize = getInt("pageSize", 30);
  const filter = get("action", "all");
  const spaceId = get("space", "all");

  const [spaces, setSpaces] = useState<Space[]>([]);

  useEffect(() => {
    apiFetch<Space[]>("/spaces")
      .then(setSpaces)
      .catch(() => {});
  }, []);

  const { data, isLoading, mutate } = useSWR<PaginatedAudit>(
    ["/owner/audit", { page, pageSize, action: filter, spaceId }],
    pageFetcher,
  );
  const entries = data?.data ?? [];
  const lastPage = data?.lastPage ?? 1;
  const total = data?.total ?? 0;

  const spaceName = spaces.find(
    (s) => s.spaceId === (spaceId === "all" ? undefined : spaceId),
  )?.name;

  // Group entries by date label
  const groups: { label: string; entries: AuditEntry[] }[] = [];
  for (const entry of entries) {
    const label = groupLabel(entry.createdAt);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.entries.push(entry);
    else groups.push({ label, entries: [entry] });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-xl text-foreground tracking-tight">
          Logs
        </h1>
        <span className="text-xs text-muted-foreground">{total} entries</span>
      </div>

      <SpaceFilterBanner spaceName={spaceName} />

      {/* Content */}
      {isLoading && !data ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <IconActivity size={32} className="text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No activity yet</p>
        </div>
      ) : (
        <div
          className={`space-y-5 relative transition-opacity ${isLoading && data ? "opacity-50 pointer-events-none" : ""}`}
        >
          {isLoading && data && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <IconLoader2
                size={24}
                className="animate-spin text-muted-foreground"
              />
            </div>
          )}
          {groups.map((group) => (
            <div key={group.label}>
              {/* Date heading */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-border/60" />
              </div>

              {/* Entries */}
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {group.entries.map((entry) => {
                    const Icon =
                      ACTION_ICONS[entry.action] ?? ACTION_ICONS.default;
                    const dot = DOT_COLOR[entry.action] ?? DOT_COLOR.default;
                    const label =
                      ACTION_LABELS[entry.action] ??
                      entry.action.replace(/_/g, " ").toLowerCase();
                    const chip = contextChip(entry);
                    const ini = initials(entry.actorName);

                    return (
                      <div
                        key={entry.auditId}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                      >
                        {/* Colour dot */}
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${dot}`}
                        />

                        {/* Icon */}
                        <Icon
                          size={14}
                          className="text-muted-foreground shrink-0"
                        />

                        {/* Label + chip */}
                        <div className="flex-1 min-w-0 flex items-baseline gap-2">
                          <span className="text-sm font-medium text-foreground capitalize whitespace-nowrap">
                            {label}
                          </span>
                          {chip && (
                            <span className="text-xs text-muted-foreground truncate">
                              {chip}
                            </span>
                          )}
                        </div>

                        {/* Actor badge */}
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-muted-foreground">
                            {ini}
                          </span>
                        </div>

                        {/* Time */}
                        <span className="text-[10px] text-muted-foreground shrink-0 w-12 text-right">
                          {smartTime(entry.createdAt, use12)}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        className="mt-4"
        page={page}
        lastPage={lastPage}
        pageSize={pageSize}
        pageSizeOptions={[20, 30, 50, 100]}
        loading={isLoading}
        onPageChange={(p) => setParam("page", p)}
        onPageSizeChange={(s) => setParam("pageSize", s)}
        onRefresh={() => mutate()}
      />
    </div>
  );
}

export default function OwnerActivityPage() {
  return (
    <Suspense>
      <ActivityInner />
    </Suspense>
  );
}
