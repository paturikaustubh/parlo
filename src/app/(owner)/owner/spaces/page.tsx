"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/components/ui/toast";
import { IconMapPin, IconPlus, IconRadio } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { Space } from "@/shared/types/entities";
import { useOwnerLimits } from "@/hooks/use-owner-limits";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SPACE_TYPES = [
  "Parking Lot",
  "Garage",
  "Mall Parking",
  "Street Parking",
  "Other",
] as const;

export default function OwnerSpacesPage() {
  const router = useRouter();
  const { atSpaceLimit, isExpired, sub, status } = useOwnerLimits();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [spaceType, setSpaceType] = useState("");
  const [saving, setSaving] = useState(false);

  const spaceButtonTooltip = atSpaceLimit
    ? status === "EXPIRED" || status === "CANCELLED"
      ? "Subscription inactive. Renew to add spaces."
      : `Limit reached (${sub?.usage.spacesUsed ?? 0}/${sub?.plan.maxSpaces ?? 0}). Upgrade your plan.`
    : null;

  const fetchSpaces = useCallback(async () => {
    try {
      const data = await apiFetch<Space[]>("/spaces");
      setSpaces(data);
    } catch {
      showToast("Failed to load spaces.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  async function handleAddSpace() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const created = await apiFetch<Space>("/spaces", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || undefined,
          spaceType: spaceType || undefined,
        }),
      });
      setSpaces((s) => [...s, created]);
      showToast("Space added.", "success");
      setShowAdd(false);
      setName("");
      setAddress("");
      setSpaceType("");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to add space.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(space: Space) {
    try {
      const updated = await apiFetch<Space>(`/spaces/${space.spaceId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !space.isActive }),
      });
      setSpaces((s) =>
        s.map((sp) => (sp.spaceId === updated.spaceId ? updated : sp)),
      );
    } catch {
      showToast("Failed to update space.", "error");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
            Spaces
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {spaces.length} parking {spaces.length === 1 ? "space" : "spaces"}
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="sm"
                disabled={atSpaceLimit || isExpired}
                onClick={() => setShowAdd(true)}
              >
                <IconPlus size={15} /> Add space
              </Button>
            </span>
          </TooltipTrigger>
          {spaceButtonTooltip && (
            <TooltipContent>{spaceButtonTooltip}</TooltipContent>
          )}
        </Tooltip>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : spaces.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <IconMapPin size={32} className="text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            No spaces yet. Add your first parking space.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={atSpaceLimit || isExpired}
            onClick={() => setShowAdd(true)}
          >
            <IconPlus size={15} /> Add space
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {spaces.map((space) => (
            <Card
              key={space.spaceId}
              className="group hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-pointer overflow-hidden"
              onClick={() => router.push(`/owner/spaces/${space.spaceId}`)}
            >
              <CardHeader>
                <CardTitle className="font-heading font-bold text-base leading-tight truncate">
                  {space.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {space.spaceType && (
                  <span className="text-xs text-muted-foreground">
                    {space.spaceType}
                  </span>
                )}
                {space.address && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                    <IconMapPin size={11} className="shrink-0" />
                    {space.address}
                  </p>
                )}
              </CardContent>
              <CardFooter className="justify-between">
                <Badge
                  variant={space.isActive ? "outline" : "secondary"}
                  className={cn(
                    space.isActive
                      ? "text-emerald-600 border-emerald-600/30 text-[10px]"
                      : "text-[10px]",
                    isExpired && "pointer-events-none opacity-50",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isExpired) toggleActive(space);
                  }}
                >
                  {space.isActive ? "Active" : "Inactive"}
                </Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs gap-1"
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link href={`/owner/spaces/${space.spaceId}/operate`}>
                    <IconRadio size={12} /> Operate
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add space dialog */}
      <Dialog
        open={showAdd}
        onOpenChange={(o) => {
          setShowAdd(o);
          if (!o) {
            setName("");
            setAddress("");
            setSpaceType("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a Parking Space</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label
                htmlFor="space-name"
                className="text-xs font-medium text-muted-foreground"
              >
                Space name *
              </label>
              <Input
                id="space-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Main Parking Lot"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="space-address"
                className="text-xs font-medium text-muted-foreground"
              >
                Address (optional)
              </label>
              <Textarea
                id="space-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123, MG Road, Bengaluru"
                rows={2}
              />
            </div>
            <Select value={spaceType} onValueChange={setSpaceType}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Space type (optional)" />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button disabled={!name.trim() || saving} onClick={handleAddSpace}>
              {saving ? "Adding…" : "Add space"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
