"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { showToast } from "@/components/ui/toast";
import {
  IconPlus,
  IconDotsVertical,
  IconPencil,
  IconTrash,
  IconCar,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import {
  VEHICLE_ICONS,
  VEHICLE_TYPE_OPTIONS,
  DISPLAY_TO_TYPE,
  TYPE_TO_DISPLAY,
} from "@/lib/vehicle-utils";
import type { Vehicle } from "@/shared/types/entities";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [plate, setPlate] = useState("");
  const [displayType, setDisplayType] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchVehicles = useCallback(async () => {
    try {
      const data = await apiFetch<Vehicle[]>("/vehicles");
      setVehicles(data.filter((v) => v.isActive));
    } catch {
      showToast("Failed to load vehicles.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  function openAdd() {
    setPlate("");
    setDisplayType("");
    setEditTarget(null);
    setShowAdd(true);
  }

  function openEdit(v: Vehicle) {
    setPlate(v.vehicleNumber);
    setDisplayType(TYPE_TO_DISPLAY[v.vehicleType]);
    setEditTarget(v);
    setShowAdd(true);
  }

  async function handleSave() {
    if (!plate || !displayType) return;
    setSaving(true);
    const vehicleType = DISPLAY_TO_TYPE[displayType];
    try {
      if (editTarget) {
        const updated = await apiFetch<Vehicle>(
          `/vehicles/${editTarget.vehicleId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              vehicleNumber: plate.toUpperCase(),
              vehicleType,
            }),
          },
        );
        setVehicles((vs) =>
          vs.map((v) => (v.vehicleId === updated.vehicleId ? updated : v)),
        );
        showToast("Vehicle updated.", "success");
      } else {
        const created = await apiFetch<Vehicle>("/vehicles", {
          method: "POST",
          body: JSON.stringify({
            vehicleNumber: plate.toUpperCase(),
            vehicleType,
          }),
        });
        setVehicles((vs) => [...vs, created]);
        showToast("Vehicle added.", "success");
      }
      setShowAdd(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Save failed.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/vehicles/${deleteTarget.vehicleId}`, {
        method: "DELETE",
      });
      setVehicles((vs) =>
        vs.filter((v) => v.vehicleId !== deleteTarget.vehicleId),
      );
      showToast(`${deleteTarget.vehicleNumber} removed.`, "info");
    } catch {
      showToast("Failed to remove vehicle.", "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-xl text-foreground">
          My Vehicles
        </h1>
        <Button size="sm" onClick={openAdd}>
          <IconPlus size={15} /> Add
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : vehicles.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {vehicles.map((v) => {
            const Icon = VEHICLE_ICONS[v.vehicleType];
            return (
              <Card key={v.vehicleId} className="relative group">
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon size={18} />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Options for ${v.vehicleNumber}`}
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <IconDotsVertical size={15} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEdit(v)}
                          className="flex items-center gap-2"
                        >
                          <IconPencil size={14} /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(v)}
                          className="flex items-center gap-2 text-destructive focus:text-destructive"
                        >
                          <IconTrash size={14} /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div>
                    <p className="font-mono font-bold text-sm text-foreground tracking-wider">
                      {v.vehicleNumber}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {v.nickname ?? TYPE_TO_DISPLAY[v.vehicleType]}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 space-y-3">
          <IconCar size={36} className="text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            No vehicles added yet.
          </p>
          <Button variant="outline" size="sm" onClick={openAdd}>
            <IconPlus size={15} /> Add your first vehicle
          </Button>
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog
        open={showAdd}
        onOpenChange={(open) => {
          setShowAdd(open);
          if (!open) {
            setPlate("");
            setDisplayType("");
            setEditTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Vehicle" : "Add Vehicle"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label
                htmlFor="dialog-vehicle-type"
                className="text-xs font-medium text-muted-foreground"
              >
                Vehicle type
              </label>
              <Select value={displayType} onValueChange={setDisplayType}>
                <SelectTrigger id="dialog-vehicle-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="dialog-plate"
                className="text-xs font-medium text-muted-foreground"
              >
                Number plate
              </label>
              <Input
                id="dialog-plate"
                placeholder="KA01AB1234"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                className="font-mono uppercase"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button
              disabled={!plate || !displayType || saving}
              onClick={handleSave}
            >
              {saving ? "Saving…" : editTarget ? "Save changes" : "Add vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove{" "}
              <strong className="font-mono text-foreground">
                {deleteTarget?.vehicleNumber}
              </strong>{" "}
              from your account? This won&apos;t affect past session history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
