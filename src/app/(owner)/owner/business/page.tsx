"use client";

import { useEffect, useState } from "react";
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
import { showToast } from "@/components/ui/toast";
import {
  IconBuilding,
  IconPencil,
  IconFile,
  IconExternalLink,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/vehicle-utils";

interface Business {
  businessId: string;
  name: string;
  status: string;
  isDemo: boolean;
  createdAt: string;
}

interface BusinessRegistration {
  businessRegistrationId: string;
  documentUrls: Record<string, string>;
  licenseNumber: string | null;
  gstNumber: string | null;
  status: string;
}

export default function OwnerBusinessPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [registration, setRegistration] = useState<BusinessRegistration | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const biz = await apiFetch<Business>("/businesses/me");
        setBusiness(biz);
        setNewName(biz.name);
        // Fetch the original registration for documents
        const regs = await apiFetch<BusinessRegistration[]>(
          "/business-registrations/me",
        );
        if (regs && regs[0]) setRegistration(regs[0]);
      } catch {
        showToast("Failed to load business info.", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSaveName() {
    if (!business || !newName.trim()) return;
    setSaving(true);
    try {
      const updated = await apiFetch<Business>(
        `/businesses/${business.businessId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ name: newName.trim() }),
        },
      );
      setBusiness(updated);
      showToast("Business name updated.", "success");
      setShowEdit(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Update failed.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-32 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!business) return null;

  const statusStyles: Record<string, string> = {
    ACTIVE: "text-emerald-600 border-emerald-600/30",
    PENDING: "text-amber-600 border-amber-600/30",
    REJECTED: "text-destructive border-destructive/30",
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
        Business
      </h1>

      {/* Business profile */}
      <Card>
        <CardContent className="p-0">
          <div className="px-5 py-4 border-b border-border/60 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-heading font-bold text-xl text-foreground">
                  {business.name}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${statusStyles[business.status] ?? ""}`}
                >
                  {business.status}
                </Badge>
                {business.isDemo && (
                  <Badge variant="secondary" className="text-[10px]">
                    Demo
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Registered {formatDate(business.createdAt)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => setShowEdit(true)}
            >
              <IconPencil size={15} /> Edit
            </Button>
          </div>

          {/* License/GST */}
          {registration &&
            (registration.licenseNumber || registration.gstNumber) && (
              <div className="px-5 py-3 border-b border-border/60 space-y-1.5">
                {registration.licenseNumber && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      License number
                    </span>
                    <span className="font-mono font-medium text-foreground">
                      {registration.licenseNumber}
                    </span>
                  </div>
                )}
                {registration.gstNumber && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">GST number</span>
                    <span className="font-mono font-medium text-foreground">
                      {registration.gstNumber}
                    </span>
                  </div>
                )}
              </div>
            )}
        </CardContent>
      </Card>

      {/* Documents */}
      {registration &&
        Object.keys(registration.documentUrls ?? {}).length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Documents
            </p>
            <div className="space-y-2">
              {Object.entries(registration.documentUrls).map(([cat, url]) => (
                <a
                  key={cat}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/30 transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconFile size={15} className="text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground capitalize flex-1">
                    {cat.replace(/_/g, " ")}
                  </span>
                  <IconExternalLink
                    size={14}
                    className="text-muted-foreground/40 group-hover:text-primary transition-colors"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

      {/* Edit business name dialog */}
      <Dialog
        open={showEdit}
        onOpenChange={(o) => {
          setShowEdit(o);
          if (!o) setNewName(business?.name ?? "");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Business Name</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Business name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newName.trim() || saving || newName === business?.name}
              onClick={handleSaveName}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
