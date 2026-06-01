"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { showToast } from "@/components/ui/toast";
import {
  IconMapPin,
  IconArrowLeft,
  IconArrowRight,
  IconCar,
  IconCurrencyRupee,
  IconUsers,
  IconListCheck,
  IconTicket,
  IconChartBar,
  IconFileText,
  IconRadio,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { formatAmount } from "@/lib/vehicle-utils";
import { cn } from "@/lib/utils";
import { useOwnerLimits } from "@/hooks/use-owner-limits";

// ─── Types ────────────────────────────────────────────────────────────────────

const SPACE_TYPES = [
  "Parking Lot",
  "Garage",
  "Mall Parking",
  "Street Parking",
  "Other",
] as const;

interface Space {
  spaceId: string;
  name: string;
  address: string | null;
  spaceType: string | null;
  isActive: boolean;
}

interface LiveStats {
  currentlyParked: number;
  onDutyStaff: number;
  activeRequests: number;
}

interface RevenueStats {
  revenuePaise: number;
  sessionCount: number;
}

type Period = "today" | "7d" | "30d" | "all" | "custom";

// ─── Quick-access nav items ────────────────────────────────────────────────────

const NAV_LINKS = (spaceId: string) => [
  {
    href: `/owner/spaces/${spaceId}/pricing`,
    label: "Pricing",
    icon: IconCurrencyRupee,
  },
  {
    href: `/owner/sessions?space=${spaceId}`,
    label: "Sessions",
    icon: IconTicket,
  },
  {
    href: `/owner/queue?space=${spaceId}`,
    label: "Requests",
    icon: IconListCheck,
  },
  { href: `/owner/staff?space=${spaceId}`, label: "Staff", icon: IconUsers },
  {
    href: `/owner/reports?space=${spaceId}`,
    label: "Reports",
    icon: IconChartBar,
  },
  {
    href: `/owner/activity?space=${spaceId}`,
    label: "Activity",
    icon: IconFileText,
  },
  {
    href: `/owner/spaces/${spaceId}/operate`,
    label: "Operate",
    icon: IconRadio,
  },
];

// ─── Period helpers ────────────────────────────────────────────────────────────

function periodRange(
  period: Period,
  customFrom: string,
  customTo: string,
): { from?: string; to?: string } {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  switch (period) {
    case "today":
      return { from: startOfToday.toISOString(), to: now.toISOString() };
    case "7d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      d.setHours(0, 0, 0, 0);
      return { from: d.toISOString(), to: now.toISOString() };
    }
    case "30d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      d.setHours(0, 0, 0, 0);
      return { from: d.toISOString(), to: now.toISOString() };
    }
    case "all":
      return {};
    case "custom": {
      const f = customFrom ? new Date(customFrom) : undefined;
      const t = customTo ? new Date(customTo) : undefined;
      if (t) t.setHours(23, 59, 59, 999);
      return { from: f?.toISOString(), to: t?.toISOString() };
    }
  }
}

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SpaceDetailPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const router = useRouter();

  const { isExpired } = useOwnerLimits();
  const [space, setSpace] = useState<Space | null>(null);
  const [live, setLive] = useState<LiveStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueStats | null>(null);
  const [period, setPeriod] = useState<Period>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const revenueCache = useRef<Map<string, RevenueStats>>(new Map());
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editSpaceType, setEditSpaceType] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load space + live stats once
  useEffect(() => {
    async function load() {
      try {
        const s = await apiFetch<Space>(`/spaces/${spaceId}`);
        setSpace(s);
      } catch {
        router.replace("/owner/spaces");
        return;
      }
      try {
        const l = await apiFetch<LiveStats>(`/spaces/${spaceId}/stats`);
        setLive(l);
      } catch {
        /* silent */
      }
      setLoadingPage(false);
    }
    load();
  }, [spaceId, router]);

  // Load revenue on period change — show cache immediately, refresh in background
  const fetchRevenue = useCallback(async () => {
    if (period === "custom" && (!customFrom || !customTo)) return;
    const { from, to } = periodRange(period, customFrom, customTo);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const key = params.toString();
    const cached = revenueCache.current.get(key);
    if (cached) {
      setRevenue(cached);
      setLoadingRevenue(false);
    } else {
      setLoadingRevenue(true);
    }
    try {
      const r = await apiFetch<RevenueStats>(
        `/spaces/${spaceId}/revenue?${params}`,
      );
      revenueCache.current.set(key, r);
      setRevenue(r);
    } catch {
      /* silent */
    } finally {
      setLoadingRevenue(false);
    }
  }, [spaceId, period, customFrom, customTo]);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  function openEdit() {
    if (!space) return;
    setEditName(space.name);
    setEditAddress(space.address ?? "");
    setEditSpaceType(space.spaceType ?? "");
    setShowEdit(true);
  }

  async function handleEditSave() {
    if (!space || !editName.trim()) return;
    setEditSaving(true);
    try {
      const updated = await apiFetch<Space>(`/spaces/${space.spaceId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName.trim(),
          address: editAddress.trim() || undefined,
          spaceType: editSpaceType || undefined,
        }),
      });
      setSpace(updated);
      showToast("Space updated.", "success");
      setShowEdit(false);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to update space.",
        "error",
      );
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!space) return;
    setDeleting(true);
    try {
      await apiFetch(`/spaces/${space.spaceId}`, { method: "DELETE" });
      showToast("Space deleted.", "success");
      router.push("/owner/spaces");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete space.";
      showToast(
        msg.includes("active")
          ? "Space has active sessions. End them first."
          : msg,
        "error",
      );
      setDeleting(false);
    }
  }

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (loadingPage) {
    return (
      <div className="space-y-4">
        <div className="h-16 rounded-2xl bg-muted animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-32 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!space) return null;

  return (
    <>
      <div className="md:flex md:gap-6 md:items-start">
        {/* ── Main content ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Header */}
          <div>
            <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3">
              <Link href="/owner/spaces">
                <IconArrowLeft size={16} /> All spaces
              </Link>
            </Button>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
                  {space.name}
                </h1>
                {space.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <IconMapPin size={13} /> {space.address}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant={space.isActive ? "outline" : "secondary"}
                  className={
                    space.isActive
                      ? "text-emerald-600 border-emerald-600/30"
                      : ""
                  }
                >
                  {space.isActive ? "Active" : "Inactive"}
                </Badge>
                <Button size="sm" variant="default" asChild className="gap-1.5">
                  <Link href={`/owner/spaces/${spaceId}/operate`}>
                    <IconRadio size={14} /> Operate
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Live stats — 3 real-time cards */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Live
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Parked",
                  value: String(live?.currentlyParked ?? 0),
                  icon: IconCar,
                  href: `/owner/vehicles?space=${spaceId}`,
                },
                {
                  label: "On duty",
                  value: String(live?.onDutyStaff ?? 0),
                  icon: IconUsers,
                  href: undefined,
                },
                {
                  label: "Requests",
                  value: String(live?.activeRequests ?? 0),
                  icon: IconListCheck,
                  href: undefined,
                },
              ].map(({ label, value, icon: Icon, href }) => (
                <Card
                  key={label}
                  className={
                    href
                      ? "hover:border-primary/30 transition-colors cursor-pointer"
                      : ""
                  }
                >
                  <CardContent className="">
                    {href ? (
                      <Link href={href} className="block">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {label}
                          </p>
                          <Icon size={13} className="text-muted-foreground" />
                        </div>
                        <p className="font-heading font-bold text-2xl text-foreground leading-none">
                          {value}
                        </p>
                      </Link>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {label}
                          </p>
                          <Icon size={13} className="text-muted-foreground" />
                        </div>
                        <p className="font-heading font-bold text-2xl text-foreground leading-none">
                          {value}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Revenue section */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Revenue
            </p>
            <Card>
              <CardContent className="space-y-4">
                {/* Period tab group */}
                <div className="flex rounded-lg bg-muted p-1 gap-0.5">
                  {PERIODS.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setPeriod(key)}
                      className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        period === key
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Custom date range */}
                {period === "custom" && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <Input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                )}

                {/* Revenue value */}
                {loadingRevenue ? (
                  <div className="h-10 w-32 rounded-lg bg-muted animate-pulse" />
                ) : (
                  <div className="flex items-baseline gap-3">
                    <p className="font-heading font-bold text-3xl text-primary leading-none">
                      {formatAmount(revenue?.revenuePaise ?? 0)}
                    </p>
                    {revenue && (
                      <p className="text-xs text-muted-foreground">
                        {revenue.sessionCount} session
                        {revenue.sessionCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Manage section */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Manage
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={openEdit}
                disabled={isExpired}
                className="ml-auto flex items-center justify-between px-3 py-2.5 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/40 transition-all group gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2.5">
                  <IconPencil
                    size={15}
                    className="text-muted-foreground group-hover:text-primary transition-colors"
                  />
                  <span className="text-sm font-medium text-foreground">
                    Edit space
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                disabled={isExpired}
                className="ml-auto flex items-center justify-between px-3 py-2.5 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/40 transition-all group gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2.5">
                  <IconTrash
                    size={15}
                    className="text-destructive/60 group-hover:text-destructive transition-colors"
                  />
                  <span className="text-sm font-medium text-destructive/80 group-hover:text-destructive transition-colors">
                    Delete space
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Mobile quick access (below content on small screens) */}
          <div className="md:hidden">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Quick access
            </p>
            <div className="space-y-1">
              {NAV_LINKS(spaceId).map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      size={15}
                      className="text-muted-foreground group-hover:text-primary transition-colors"
                    />
                    <span className="text-sm font-medium text-foreground">
                      {label}
                    </span>
                  </div>
                  <IconArrowRight
                    size={13}
                    className="text-muted-foreground/40 group-hover:text-primary transition-colors"
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Sticky sidebar (md+) ──────────────────────────────────────────── */}
        <aside className="hidden md:block w-36 shrink-0 sticky top-20">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Quick access
          </p>
          <nav className="space-y-0.5">
            {NAV_LINKS(spaceId).map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors group"
              >
                <Icon
                  size={14}
                  className="shrink-0 group-hover:text-primary transition-colors"
                />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </aside>
      </div>

      {/* Edit space dialog */}
      <Dialog
        open={showEdit}
        onOpenChange={(o) => {
          if (!o) setShowEdit(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Space</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label
                htmlFor="edit-name"
                className="text-xs font-medium text-muted-foreground"
              >
                Space name *
              </label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Main Parking Lot"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="edit-address"
                className="text-xs font-medium text-muted-foreground"
              >
                Address (optional)
              </label>
              <Textarea
                id="edit-address"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="123, MG Road, Bengaluru"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Space type (optional)
              </label>
              <Select value={editSpaceType} onValueChange={setEditSpaceType}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SPACE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button
              disabled={!editName.trim() || editSaving}
              onClick={handleEditSave}
            >
              {editSaving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={showDelete}
        onOpenChange={(o) => {
          if (!o) setShowDelete(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete space?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">
                {space?.name}
              </span>
              . Active sessions must end before deletion. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
