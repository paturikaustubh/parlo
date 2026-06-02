"use client";

import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/components/ui/toast";
import {
  IconExternalLink,
  IconCheck,
  IconX,
  IconReceiptRupee,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import type { BusinessRegistration } from "@/shared/types/entities";
import { ContactChip } from "@/components/shared/contact-chip";

function LinkChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
    >
      {label}
    </button>
  );
}

interface SubscriptionRequest {
  subscriptionRequestId: string;
  businessId: string;
  planId: string;
  billingCycle: string;
  status: string;
  notes: string | null;
  reviewNotes: string | null;
  createdAt: string;
  linkId?: string | null;
  paymentProofUrl?: string | null;
  requester?: { name: string; phone: string };
  plan?: {
    name: string;
    priceMonthlyPaise: number | null;
    priceYearlyPaise: number | null;
  };
  business?: { name: string };
}

interface PaginatedRegistrations {
  data: BusinessRegistration[];
  total: number;
}

interface PaginatedSubRequests {
  data: SubscriptionRequest[];
  total: number;
}

export default function VerifierReviewsPage() {
  const [pendingRegs, setPendingRegs] = useState<BusinessRegistration[]>([]);
  const [pendingPayments, setPendingPayments] = useState<SubscriptionRequest[]>(
    [],
  );
  const [historyRegs, setHistoryRegs] = useState<BusinessRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<string>("registrations");
  const [actionTarget, setActionTarget] = useState<{
    type: "reg" | "payment";
    id: string;
  } | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null,
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [regsRes, paymentsRes, historyRes] = await Promise.allSettled([
      apiFetch<PaginatedRegistrations>(
        "/verifier/registrations?status=PENDING&pageSize=50",
      ),
      apiFetch<PaginatedSubRequests>(
        "/verifier/subscription-requests?status=PENDING&pageSize=50",
      ),
      apiFetch<PaginatedRegistrations>("/verifier/registrations?pageSize=50"),
    ]);
    if (regsRes.status === "fulfilled")
      setPendingRegs(regsRes.value.data ?? []);
    if (paymentsRes.status === "fulfilled")
      setPendingPayments(paymentsRes.value.data ?? []);
    if (historyRes.status === "fulfilled") {
      setHistoryRegs(
        (historyRes.value.data ?? []).filter((r) => r.status !== "PENDING"),
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function submitAction() {
    if (!actionTarget || !actionType) return;
    setSubmitting(true);
    const body = {
      status: actionType === "approve" ? "APPROVED" : "REJECTED",
      notes: notes.trim() || undefined,
    };
    try {
      if (actionTarget.type === "reg") {
        await apiFetch(`/verifier/registrations/${actionTarget.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch(`/verifier/subscription-requests/${actionTarget.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }
      showToast(
        actionType === "approve" ? "Approved successfully." : "Rejected.",
        "success",
      );
      setActionTarget(null);
      setActionType(null);
      setNotes("");
      fetchAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
          Review Queue
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Approve registrations and confirm payments.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="registrations" className="flex-1 text-xs">
            Registrations
            {pendingRegs.length > 0 && (
              <Badge className="ml-1.5 text-[9px] px-1.5 h-4 bg-primary/15 text-primary hover:bg-primary/15 border-0">
                {pendingRegs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex-1 text-xs">
            Payments
            {pendingPayments.length > 0 && (
              <Badge className="ml-1.5 text-[9px] px-1.5 h-4 bg-primary/15 text-primary hover:bg-primary/15 border-0">
                {pendingPayments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 text-xs">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registrations" className="space-y-3 mt-4">
          {loading ? (
            [1, 2].map((i) => (
              <div
                key={i}
                className="h-36 rounded-2xl bg-muted animate-pulse"
              />
            ))
          ) : pendingRegs.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                <IconCheck size={18} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                All caught up — no pending registrations
              </p>
            </div>
          ) : (
            pendingRegs.map((reg) => (
              <Card
                key={reg.businessRegistrationId}
                className="overflow-hidden"
              >
                <CardContent className="">
                  <CardTitle className="font-bold">
                    {reg.businessName}
                  </CardTitle>
                  <div className="border-b border-border/60 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {reg.linkId && (
                          <LinkChip
                            label="→ Payment"
                            onClick={() => setActiveTab("payments")}
                          />
                        )}
                      </div>
                      <div className="mt-1">
                        <ContactChip
                          name={reg.submittedByUser?.name}
                          phone={reg.submittedByUser?.phone}
                          label="Owner"
                        />
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      Pending
                    </Badge>
                  </div>

                  {/* Details */}
                  <div className="py-3 space-y-1.5 border-b border-border/60">
                    <div className="grid grid-cols-[80px_1fr] gap-1 text-xs">
                      <span className="text-muted-foreground font-medium">
                        Space
                      </span>
                      <span className="text-foreground">
                        {reg.spaceName}, {reg.spaceAddress}
                      </span>
                    </div>
                    <div className="grid grid-cols-[80px_1fr] gap-1 text-xs">
                      <span className="text-muted-foreground font-medium">
                        License
                      </span>
                      <span className="text-foreground font-mono">
                        {reg.licenseNumber ?? "—"}
                      </span>
                    </div>
                    {reg.gstNumber && (
                      <div className="grid grid-cols-[80px_1fr] gap-1 text-xs">
                        <span className="text-muted-foreground font-medium">
                          GST
                        </span>
                        <span className="text-foreground font-mono">
                          {reg.gstNumber}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Documents as chips */}
                  {Object.entries(reg.documentUrls ?? {}).length > 0 && (
                    <div className="px-4 py-3 border-b border-border/60">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Documents
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(reg.documentUrls).map(([cat, url]) => (
                          <a
                            key={cat}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/30 text-xs font-medium text-muted-foreground transition-colors capitalize"
                          >
                            <IconExternalLink size={10} />
                            {cat.replace(/_/g, " ")}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Plan + payment proof */}
                  {(reg.plan || reg.paymentProofUrl) && (
                    <div className="px-4 py-3 border-b border-border/60 space-y-2">
                      {reg.plan &&
                        reg.billingCycle &&
                        reg.billingCycle !== "DEMO" && (
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                              <IconReceiptRupee size={13} />
                              Selected plan
                            </div>
                            <span className="font-semibold text-foreground">
                              {reg.plan.name} ·{" "}
                              {reg.billingCycle.charAt(0) +
                                reg.billingCycle.slice(1).toLowerCase()}
                            </span>
                          </div>
                        )}
                      {reg.billingCycle === "DEMO" && (
                        <p className="text-xs text-muted-foreground">
                          Selected: Demo trial — no payment required
                        </p>
                      )}
                      {reg.paymentProofUrl && (
                        <a
                          href={reg.paymentProofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-xs font-medium text-primary transition-colors"
                        >
                          <IconExternalLink size={11} />
                          View payment proof
                        </a>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="px-4 py-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-9 text-xs font-semibold text-destructive border-destructive/20 hover:bg-destructive/8 hover:border-destructive/40"
                      onClick={() => {
                        setActionTarget({
                          type: "reg",
                          id: reg.businessRegistrationId,
                        });
                        setActionType("reject");
                      }}
                    >
                      <IconX size={13} /> Reject
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-9 text-xs font-semibold"
                      onClick={() => {
                        setActionTarget({
                          type: "reg",
                          id: reg.businessRegistrationId,
                        });
                        setActionType("approve");
                      }}
                    >
                      <IconCheck size={13} /> Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="payments" className="space-y-3 mt-4">
          {loading ? (
            [1, 2].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-muted animate-pulse"
              />
            ))
          ) : pendingPayments.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                <IconCheck size={18} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No pending payment confirmations
              </p>
            </div>
          ) : (
            pendingPayments.map((req) => (
              <Card key={req.subscriptionRequestId} className="overflow-hidden">
                <CardContent className="">
                  <CardTitle className="font-bold">
                    {req.business?.name ?? "—"}
                  </CardTitle>
                  <div className="border-b border-border/60 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {req.linkId && (
                          <LinkChip
                            label="← Registration"
                            onClick={() => setActiveTab("registrations")}
                          />
                        )}
                      </div>
                      <div className="mt-1">
                        <ContactChip
                          name={req.requester?.name}
                          phone={req.requester?.phone}
                          label="Owner"
                        />
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {req.plan?.name ?? "—"}
                    </Badge>
                  </div>
                  <div className="px-4 py-3 border-b border-border/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Amount claimed paid
                        </p>
                        <p className="font-heading font-bold text-lg text-foreground mt-0.5">
                          ₹
                          {(
                            ((req.billingCycle === "YEARLY"
                              ? req.plan?.priceYearlyPaise
                              : req.plan?.priceMonthlyPaise) ?? 0) / 100
                          ).toLocaleString("en-IN")}
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            /{req.billingCycle === "MONTHLY" ? "mo" : "yr"}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Billing
                        </p>
                        <p className="text-xs font-medium text-foreground mt-0.5 capitalize">
                          {req.billingCycle.toLowerCase()}
                        </p>
                      </div>
                    </div>
                    {req.paymentProofUrl && (
                      <a
                        href={req.paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-xs font-medium text-primary transition-colors"
                      >
                        <IconReceiptRupee size={12} />
                        Payment proof
                        <IconExternalLink size={11} className="opacity-60" />
                      </a>
                    )}
                  </div>
                  <div className="px-4 py-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-9 text-xs font-semibold text-destructive border-destructive/20 hover:bg-destructive/8 hover:border-destructive/40"
                      onClick={() => {
                        setActionTarget({
                          type: "payment",
                          id: req.subscriptionRequestId,
                        });
                        setActionType("reject");
                      }}
                    >
                      <IconX size={13} /> Reject
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-9 text-xs font-semibold"
                      onClick={() => {
                        setActionTarget({
                          type: "payment",
                          id: req.subscriptionRequestId,
                        });
                        setActionType("approve");
                      }}
                    >
                      <IconCheck size={13} /> Confirm Payment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 rounded-xl bg-muted animate-pulse mb-2"
              />
            ))
          ) : historyRegs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No history yet
            </p>
          ) : (
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {historyRegs.map((reg) => (
                  <div
                    key={reg.businessRegistrationId}
                    className="flex items-center justify-between px-4 py-3.5 gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {reg.businessName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(reg.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <Badge
                      variant={
                        reg.status === "APPROVED" ? "outline" : "destructive"
                      }
                      className={
                        reg.status === "APPROVED"
                          ? "text-emerald-600 border-emerald-600/30 bg-emerald-500/5 text-[10px] shrink-0"
                          : "text-[10px] shrink-0"
                      }
                    >
                      {reg.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!actionTarget}
        onOpenChange={(o) => {
          if (!o) {
            setActionTarget(null);
            setActionType(null);
            setNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve"
                ? actionTarget?.type === "reg"
                  ? "Approve registration?"
                  : "Confirm payment received?"
                : actionTarget?.type === "reg"
                  ? "Reject registration"
                  : "Reject payment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                actionType === "reject"
                  ? "Reason for rejection (required)"
                  : "Optional notes"
              }
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionTarget(null);
                setActionType(null);
                setNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={
                submitting || (actionType === "reject" && !notes.trim())
              }
              onClick={submitAction}
              className={
                actionType === "reject"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {submitting
                ? "Processing…"
                : actionType === "approve"
                  ? "Confirm"
                  : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
