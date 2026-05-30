"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/components/ui/toast";
import {
  IconUsers,
  IconUserPlus,
  IconPhone,
  IconCheck,
  IconX,
  IconMapPin,
  IconPencil,
  IconFlag,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { StaffMember, Space } from "@/shared/types/entities";
import { useOwnerLimits } from "@/hooks/use-owner-limits";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StaffWithFlags extends StaffMember {
  openFlagCount: number;
}

interface StaffFlag {
  staffFlagId: string;
  type: string;
  description: string;
  status: string;
  createdAt: string;
}

interface StaffRequest {
  staffRequestId: string;
  user: { userId: string; name: string; phone: string };
  space?: { spaceId: string; name: string } | null;
  notes?: string;
  status: string;
  createdAt: string;
}

export default function OwnerStaffPage() {
  const [staff, setStaff] = useState<StaffWithFlags[]>([]);
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite dialog
  const [showInvite, setShowInvite] = useState(false);
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteSpace, setInviteSpace] = useState("none");
  const [inviting, setInviting] = useState(false);

  // Flag viewer state
  const [viewFlagsStaff, setViewFlagsStaff] = useState<StaffWithFlags | null>(
    null,
  );
  const [staffFlags, setStaffFlags] = useState<StaffFlag[]>([]);

  // Edit staff dialog
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [editSpace, setEditSpace] = useState("none");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [saving, setSaving] = useState(false);

  const { atStaffLimit, sub, status } = useOwnerLimits();

  const staffButtonTooltip = atStaffLimit
    ? status === "EXPIRED" || status === "CANCELLED"
      ? "Subscription inactive. Renew to invite staff."
      : `Staff limit reached (${sub?.usage.staffUsed ?? 0}/${sub?.plan.maxStaff ?? 0}). Upgrade your plan.`
    : null;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [staffRes, requestsRes, spacesRes] = await Promise.allSettled([
      apiFetch<StaffWithFlags[]>("/owner/staff?status=ACTIVE"),
      apiFetch<StaffRequest[]>("/staff-requests?status=PENDING"),
      apiFetch<Space[]>("/spaces"),
    ]);
    if (staffRes.status === "fulfilled") setStaff(staffRes.value ?? []);
    if (requestsRes.status === "fulfilled")
      setRequests(requestsRes.value ?? []);
    if (spacesRes.status === "fulfilled") setSpaces(spacesRes.value ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (viewFlagsStaff) {
      apiFetch<StaffFlag[]>(
        `/owner/staff/${viewFlagsStaff.staffMemberId}/flags`,
      )
        .then(setStaffFlags)
        .catch(() => setStaffFlags([]));
    }
  }, [viewFlagsStaff]);

  async function handleInvite() {
    const phone = invitePhone.startsWith("+91")
      ? invitePhone
      : `+91${invitePhone}`;
    setInviting(true);
    try {
      await apiFetch("/owner/staff/invitations", {
        method: "POST",
        body: JSON.stringify({
          phone,
          spaceId: inviteSpace !== "none" ? inviteSpace : undefined,
        }),
      });
      showToast("Invitation sent.", "success");
      setShowInvite(false);
      setInvitePhone("");
      setInviteSpace("none");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to send invitation.",
        "error",
      );
    } finally {
      setInviting(false);
    }
  }

  async function handleRequest(requestId: string, approved: boolean) {
    try {
      await apiFetch(`/staff-requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: approved ? "APPROVED" : "REJECTED" }),
      });
      showToast(
        approved ? "Request approved." : "Request rejected.",
        "success",
      );
      fetchAll();
    } catch {
      showToast("Action failed.", "error");
    }
  }

  function openEdit(s: StaffMember) {
    setEditStaff(s);
    setEditSpace(s.spaceId ?? "none");
    setEditStatus(s.status as "ACTIVE" | "INACTIVE");
  }

  async function handleSaveEdit() {
    if (!editStaff) return;
    setSaving(true);
    try {
      await apiFetch(`/owner/staff/${editStaff.staffMemberId}`, {
        method: "PATCH",
        body: JSON.stringify({
          spaceId: editSpace !== "none" ? editSpace : null,
          status: editStatus,
        }),
      });
      showToast("Staff updated.", "success");
      setEditStaff(null);
      fetchAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Update failed.", "error");
    } finally {
      setSaving(false);
    }
  }

  function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        {children}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
            Staff
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {staff.length} active
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={atStaffLimit ? 0 : undefined}>
              <Button
                size="sm"
                onClick={() => setShowInvite(true)}
                disabled={atStaffLimit}
              >
                <IconUserPlus size={15} /> Invite
              </Button>
            </span>
          </TooltipTrigger>
          {staffButtonTooltip && (
            <TooltipContent>
              <p>{staffButtonTooltip}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* Pending join requests */}
      {requests.length > 0 && (
        <div>
          <SectionLabel>Join requests ({requests.length})</SectionLabel>
          <div className="space-y-2">
            {requests.map((req) => (
              <Card key={req.staffRequestId} className="overflow-hidden">
                <CardContent className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {req.user.name}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <IconPhone size={11} /> {req.user.phone}
                    </p>
                    {req.space && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <IconMapPin size={10} /> Prefers: {req.space.name}
                      </p>
                    )}
                    {req.notes && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 italic truncate">
                        "{req.notes}"
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs text-destructive border-destructive/20 hover:bg-destructive/8"
                      onClick={() => handleRequest(req.staffRequestId, false)}
                    >
                      <IconX size={13} />
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleRequest(req.staffRequestId, true)}
                    >
                      <IconCheck size={13} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active staff */}
      <div>
        <SectionLabel>Active staff</SectionLabel>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <IconUsers size={28} className="text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No active staff yet</p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {staff.map((s) => {
                const spaceName = spaces.find(
                  (sp) => sp.spaceId === s.spaceId,
                )?.name;
                return (
                  <div
                    key={s.staffMemberId}
                    className="flex items-center justify-between px-4 py-3.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {s.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <IconMapPin size={11} />
                        {spaceName ?? "All spaces"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          s.isOnDuty
                            ? "text-emerald-600 border-emerald-600/30 text-[10px]"
                            : "text-muted-foreground text-[10px]"
                        }
                      >
                        {s.isOnDuty ? "On duty" : "Off duty"}
                      </Badge>
                      {s.openFlagCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setViewFlagsStaff(s)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-semibold"
                        >
                          <IconFlag size={10} />
                          {s.openFlagCount}
                        </button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(s)}
                      >
                        <IconPencil size={13} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invite dialog */}
      <Dialog
        open={showInvite}
        onOpenChange={(o) => {
          setShowInvite(o);
          if (!o) {
            setInvitePhone("");
            setInviteSpace("none");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label
                htmlFor="invite-phone"
                className="text-xs font-medium text-muted-foreground"
              >
                Phone number *
              </label>
              <div className="flex">
                <span className="flex items-center px-3 rounded-l-xl text-sm font-medium border border-r-0 border-border bg-muted text-muted-foreground">
                  +91
                </span>
                <Input
                  id="invite-phone"
                  value={invitePhone}
                  onChange={(e) =>
                    setInvitePhone(
                      e.target.value.replace(/\D/g, "").slice(0, 10),
                    )
                  }
                  placeholder="98765 43210"
                  className="rounded-l-none"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="invite-space"
                className="text-xs font-medium text-muted-foreground"
              >
                Assign to space (optional)
              </label>
              <Select value={inviteSpace} onValueChange={setInviteSpace}>
                <SelectTrigger id="invite-space">
                  <SelectValue placeholder="All spaces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All spaces</SelectItem>
                  {spaces.map((s) => (
                    <SelectItem key={s.spaceId} value={s.spaceId}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button
              disabled={invitePhone.length < 10 || inviting}
              onClick={handleInvite}
            >
              {inviting ? "Sending…" : "Send invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flags dialog */}
      <Dialog
        open={!!viewFlagsStaff}
        onOpenChange={(o) => {
          if (!o) setViewFlagsStaff(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flags — {viewFlagsStaff?.user.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
            {staffFlags.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No open flags
              </p>
            )}
            {staffFlags.map((flag) => (
              <div
                key={flag.staffFlagId}
                className="border border-border rounded-lg px-3 py-2.5 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {flag.type.replace(/_/g, " ")}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold",
                      flag.status === "RESOLVED"
                        ? "text-emerald-600"
                        : "text-amber-600",
                    )}
                  >
                    {flag.status}
                  </span>
                </div>
                <p className="text-sm text-foreground">{flag.description}</p>
                {flag.status === "OPEN" && (
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(
                        `/owner/staff/${viewFlagsStaff!.staffMemberId}/flags/${flag.staffFlagId}`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({ status: "RESOLVED" }),
                        },
                      );
                      setStaffFlags((prev) =>
                        prev.map((f) =>
                          f.staffFlagId === flag.staffFlagId
                            ? { ...f, status: "RESOLVED" }
                            : f,
                        ),
                      );
                      fetchAll();
                    }}
                    className="text-[10px] text-primary font-semibold hover:underline"
                  >
                    Mark resolved
                  </button>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewFlagsStaff(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit staff dialog */}
      <Dialog
        open={!!editStaff}
        onOpenChange={(o) => {
          if (!o) setEditStaff(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff — {editStaff?.user.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Assigned space
              </label>
              <Select value={editSpace} onValueChange={setEditSpace}>
                <SelectTrigger>
                  <SelectValue placeholder="All spaces" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All spaces</SelectItem>
                  {spaces.map((s) => (
                    <SelectItem key={s.spaceId} value={s.spaceId}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Status
              </label>
              <Select
                value={editStatus}
                onValueChange={(v) => setEditStatus(v as "ACTIVE" | "INACTIVE")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStaff(null)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={handleSaveEdit}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
