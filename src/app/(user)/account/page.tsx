"use client";

import { useState, useCallback, useEffect } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { RegistrationSheet } from "@/components/owner/registration-sheet";
import { RegistrationStatusCard } from "@/components/owner/registration-status-card";
import type { BusinessRegistration } from "@/shared/types/entities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { showToast } from "@/components/ui/toast";
import {
  IconUser,
  IconPhone,
  IconLock,
  IconBuildingStore,
  IconUsers,
  IconLogout,
  IconChevronRight,
} from "@tabler/icons-react";
import { useUser } from "@/contexts/user-context";
import { apiFetch } from "@/lib/api-client";
import { ApplyStaffSheet } from "@/components/user/apply-staff-sheet";
import { IconBriefcase } from "@tabler/icons-react";

interface StaffInvitation {
  invitationId: string;
  businessId: string;
  businessName: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function AccountPage() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { user } = useUser();
  const [showPwDialog, setShowPwDialog] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [registration, setRegistration] = useState<BusinessRegistration | null>(
    null,
  );
  const [loadingReg, setLoadingReg] = useState(true);
  const [regSheetOpen, setRegSheetOpen] = useState(false);
  const [applySheetOpen, setApplySheetOpen] = useState(false);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [actingInvitation, setActingInvitation] = useState<string | null>(null);

  const fetchRegistration = useCallback(async () => {
    try {
      const data = await apiFetch<BusinessRegistration[]>(
        "/business-registrations/me",
      );
      setRegistration(Array.isArray(data) ? (data[0] ?? null) : null);
    } catch {
      setRegistration(null);
    } finally {
      setLoadingReg(false);
    }
  }, []);

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: StaffInvitation[] }>(
        "/staff-invitations/me",
      );
      setInvitations(res.data ?? []);
    } catch {
      setInvitations([]);
    }
  }, []);

  useEffect(() => {
    fetchRegistration();
    fetchInvitations();
  }, [fetchRegistration, fetchInvitations]);

  async function handleInvitation(
    invitationId: string,
    action: "accept" | "decline",
  ) {
    setActingInvitation(invitationId);
    try {
      await apiFetch(`/staff-invitations/${invitationId}/${action}`, {
        method: "POST",
      });
      showToast(
        action === "accept" ? "Invitation accepted!" : "Invitation declined.",
        action === "accept" ? "success" : "info",
      );
      if (action === "accept") {
        setTimeout(
          () =>
            showToast(
              "Log out and log back in to access staff features.",
              "info",
            ),
          800,
        );
      }
      fetchInvitations();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.", "error");
    } finally {
      setActingInvitation(null);
    }
  }

  async function handleChangePassword() {
    if (newPw !== confirmPw) {
      setPwError("Passwords do not match.");
      return;
    }
    if (newPw.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    setPwLoading(true);
    setPwError("");
    try {
      await apiFetch("/users/me/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw,
        }),
      });
      showToast("Password updated.", "success");
      setShowPwDialog(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setPwError(
        err instanceof Error ? err.message : "Current password is incorrect.",
      );
    } finally {
      setPwLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await apiFetch("/auth/tokens/me", { method: "DELETE" });
    } catch {
      /* proceed */
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_name");
    router.push("/");
  }

  return (
    <div className="space-y-6 max-w-sm mx-auto">
      <h1 className="font-heading font-bold text-xl text-foreground">
        Account
      </h1>

      <section className="space-y-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium px-1 mb-2">
          Profile
        </p>
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border bg-card">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <IconUser size={16} className="text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Full name</p>
              <p className="text-sm font-medium text-foreground">
                {user?.name ?? "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <IconPhone size={16} className="text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Phone</p>
              <p className="text-sm font-medium text-foreground">
                {user?.phone ?? "—"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPwDialog(true)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <IconLock size={16} className="text-muted-foreground shrink-0" />
              <p className="text-sm font-medium text-foreground">
                Change password
              </p>
            </div>
            <IconChevronRight size={15} className="text-muted-foreground" />
          </button>
        </div>
      </section>

      <section className="space-y-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium px-1 mb-2">
          Preferences
        </p>
        <div className="rounded-xl border border-border overflow-hidden bg-card">
          <div className="flex items-center justify-between px-4 py-3.5">
            <label
              htmlFor="dark-mode-switch"
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              Dark mode
            </label>
            <Switch
              id="dark-mode-switch"
              checked={resolvedTheme === "dark"}
              onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
            />
          </div>
        </div>
      </section>

      {/* Business */}
      <section className="space-y-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium px-1 mb-2">
          Business
        </p>
        {loadingReg ? (
          <div className="h-20 rounded-xl bg-muted animate-pulse" />
        ) : registration ? (
          <RegistrationStatusCard
            registration={registration}
            onResubmit={(reg) => setRegistration(reg)}
            onActivated={fetchRegistration}
          />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border bg-card">
            <button
              type="button"
              onClick={() => setRegSheetOpen(true)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <IconBuildingStore
                  size={16}
                  className="text-muted-foreground shrink-0"
                />
                <p className="text-sm font-medium text-foreground">
                  Register a business
                </p>
              </div>
              <IconChevronRight size={15} className="text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => setApplySheetOpen(true)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <IconUsers
                  size={16}
                  className="text-muted-foreground shrink-0"
                />
                <p className="text-sm font-medium text-foreground">
                  Apply as staff
                </p>
              </div>
              <IconChevronRight size={15} className="text-muted-foreground" />
            </button>
          </div>
        )}
        <RegistrationSheet
          open={regSheetOpen}
          onOpenChange={setRegSheetOpen}
          onSuccess={(reg) => {
            setRegistration(reg);
            setRegSheetOpen(false);
          }}
        />
      </section>

      {/* Staff Invitations */}
      {invitations.length > 0 && (
        <section className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium px-1 mb-2">
            Staff Invitations
          </p>
          <div className="space-y-2">
            {invitations.map((inv) => (
              <div
                key={inv.invitationId}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconBriefcase size={15} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {inv.businessName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex border-t border-border divide-x divide-border">
                  <button
                    type="button"
                    disabled={actingInvitation === inv.invitationId}
                    onClick={() =>
                      handleInvitation(inv.invitationId, "decline")
                    }
                    className="flex-1 py-2.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    disabled={actingInvitation === inv.invitationId}
                    onClick={() => handleInvitation(inv.invitationId, "accept")}
                    className="flex-1 py-2.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <ApplyStaffSheet
        open={applySheetOpen}
        onOpenChange={setApplySheetOpen}
        onSuccess={fetchInvitations}
      />

      <Separator />

      <Button
        variant="ghost"
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 justify-start gap-2"
        onClick={handleLogout}
      >
        <IconLogout size={16} /> Sign out
      </Button>

      <Dialog
        open={showPwDialog}
        onOpenChange={(open) => {
          setShowPwDialog(open);
          if (!open) {
            setCurrentPw("");
            setNewPw("");
            setConfirmPw("");
            setPwError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label
                htmlFor="current-pw"
                className="text-xs font-medium text-muted-foreground"
              >
                Current password
              </label>
              <Input
                id="current-pw"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="new-pw"
                className="text-xs font-medium text-muted-foreground"
              >
                New password
              </label>
              <Input
                id="new-pw"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="confirm-pw"
                className="text-xs font-medium text-muted-foreground"
              >
                Confirm new password
              </label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>
            {pwError && <p className="text-xs text-destructive">{pwError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPwDialog(false)}>
              Cancel
            </Button>
            <Button
              disabled={!currentPw || !newPw || !confirmPw || pwLoading}
              onClick={handleChangePassword}
            >
              {pwLoading ? "Saving…" : "Update password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
