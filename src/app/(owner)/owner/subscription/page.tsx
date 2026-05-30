"use client";

import { useState } from "react";
import useSWR from "swr";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconCreditCard,
  IconCheck,
  IconX,
  IconArrowRight,
  IconSparkles,
  IconReceipt,
} from "@tabler/icons-react";
import { UpiPaymentDialog } from "@/components/owner/upi-payment-dialog";
import { OwnerDemoChip } from "@/components/owner/owner-demo-chip";
import { pageFetcher } from "@/lib/swr-fetcher";
import { cn } from "@/lib/utils";

interface Plan {
  planId: string;
  name: string;
  slug: string;
  priceMonthlyPaise: number | null;
  priceYearlyPaise: number | null;
  maxSpaces: number | null;
  maxStaff: number | null;
  analyticsDays: number | null;
  features: Record<string, boolean>;
}
interface BusinessSubscription {
  planId: string;
  status: "DEMO" | "ACTIVE" | "GRACE" | "EXPIRED" | "CANCELLED";
  billingCycle: string;
  startsAt: string;
  expiresAt: string;
  plan: Plan;
}
interface BusinessInfo {
  businessId: string;
  name: string;
}
interface SubscriptionRequest {
  subscriptionRequestId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  billingCycle: string;
  createdAt: string;
  reviewNotes?: string;
  plan: { name: string; slug: string };
}

const STATUS_STYLES: Record<string, { badge: string; label: string }> = {
  DEMO: {
    badge: "text-blue-500 border-blue-500/30 bg-blue-500/8",
    label: "Demo",
  },
  ACTIVE: {
    badge: "text-emerald-500 border-emerald-500/30 bg-emerald-500/8",
    label: "Active",
  },
  GRACE: {
    badge: "text-amber-500 border-amber-500/30 bg-amber-500/8",
    label: "Grace",
  },
  EXPIRED: {
    badge: "text-red-500 border-red-500/30 bg-red-500/8",
    label: "Expired",
  },
  CANCELLED: {
    badge: "text-muted-foreground border-border",
    label: "Cancelled",
  },
};
const REQUEST_STATUS: Record<string, string> = {
  PENDING: "text-amber-500 border-amber-500/30 bg-amber-500/8",
  APPROVED: "text-emerald-500 border-emerald-500/30 bg-emerald-500/8",
  REJECTED: "text-red-500 border-red-500/30 bg-red-500/8",
};
const FEATURE_LABELS: Record<string, string> = {
  dutyTracking: "Duty & shift tracking",
  staffPerformance: "Staff performance analytics",
  amountOverride: "Amount override",
  prioritySupport: "Priority support",
};

function daysUntil(iso: string) {
  return Math.max(
    0,
    Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000),
  );
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtPaise(p: number) {
  return `₹${(p / 100).toLocaleString("en-IN")}`;
}

export default function OwnerSubscriptionPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);

  const { data: business } = useSWR<BusinessInfo>(
    ["/businesses/me"],
    pageFetcher,
  );
  const { data: subscription, mutate: mutateSub } =
    useSWR<BusinessSubscription>(
      business ? [`/businesses/${business.businessId}/subscription`] : null,
      pageFetcher,
    );
  const { data: plans, isLoading: plansLoading } = useSWR<Plan[]>(
    ["/plans"],
    pageFetcher,
  );
  const { data: reqsData, mutate: mutateReqs } = useSWR<{
    data: SubscriptionRequest[];
  }>(["/subscription-requests"], pageFetcher);

  const paidPlans = (plans ?? []).filter(
    (p) => p.slug !== "demo" && p.slug !== "enterprise",
  );
  const requests = reqsData?.data ?? [];
  const expiryDays = subscription ? daysUntil(subscription.expiresAt) : 0;
  const statusInfo = subscription ? STATUS_STYLES[subscription.status] : null;
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
        Subscription
      </h1>

      {subscription ? (
        <Card className="overflow-hidden border-border/60">
          <CardContent className="">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-xl">
                    {subscription.plan.name}
                  </span>
                  {statusInfo && (
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] px-1.5", statusInfo.badge)}
                    >
                      {statusInfo.label}
                    </Badge>
                  )}
                </div>
                {subscription.status === "DEMO" && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-primary">
                        {expiryDays} days
                      </span>{" "}
                      remaining · expires {fmtDate(subscription.expiresAt)}
                    </p>
                    <OwnerDemoChip />
                  </div>
                )}
                {subscription.status === "ACTIVE" && (
                  <p className="text-xs text-muted-foreground">
                    Renews {fmtDate(subscription.expiresAt)} ·{" "}
                    {subscription.billingCycle.toLowerCase()}
                  </p>
                )}
                {subscription.status === "GRACE" && (
                  <p className="text-xs text-amber-500 font-medium">
                    {expiryDays} days to renew before access is blocked
                  </p>
                )}
                {subscription.status === "EXPIRED" && (
                  <p className="text-xs text-red-500 font-medium">
                    Access blocked · subscribe to restore
                  </p>
                )}
              </div>
              <IconCreditCard
                size={18}
                className="text-muted-foreground shrink-0 mt-1"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
            <IconSparkles size={28} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No active subscription
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview">
        <TabsList className="w-full">
          <TabsTrigger value="overview" className="flex-1 text-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex-1 text-xs">
            Requests
            {pendingCount > 0 && (
              <Badge className="ml-1.5 text-[9px] px-1.5 h-4 bg-primary/15 text-primary border-0 font-bold">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-5">
          {subscription && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                What&apos;s included
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {[
                  {
                    label: `${subscription.plan.maxSpaces ?? "Unlimited"} spaces`,
                    enabled: true,
                  },
                  {
                    label: `${subscription.plan.maxStaff ?? "Unlimited"} staff`,
                    enabled: true,
                  },
                  {
                    label: subscription.plan.analyticsDays
                      ? `${subscription.plan.analyticsDays}-day analytics`
                      : "Unlimited analytics",
                    enabled: true,
                  },
                  ...Object.entries(subscription.plan.features).map(
                    ([k, v]) => ({
                      label: FEATURE_LABELS[k] ?? k,
                      enabled: v as boolean,
                    }),
                  ),
                ].map(({ label, enabled }) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    {enabled ? (
                      <IconCheck size={12} className="text-primary shrink-0" />
                    ) : (
                      <IconX
                        size={12}
                        className="text-muted-foreground/30 shrink-0"
                      />
                    )}
                    <span
                      className={
                        enabled ? "text-foreground" : "text-muted-foreground/40"
                      }
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {subscription?.status === "ACTIVE"
                  ? "Upgrade"
                  : "Choose a plan"}
              </p>
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted text-xs">
                {(["monthly", "yearly"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setBillingCycle(c)}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-colors capitalize",
                      billingCycle === c
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground",
                    )}
                  >
                    {c === "yearly" ? (
                      <span className="flex items-center gap-1">
                        Yearly
                        <span className="text-[9px] font-bold text-primary ml-0.5">
                          -17%
                        </span>
                      </span>
                    ) : (
                      "Monthly"
                    )}
                  </button>
                ))}
              </div>
            </div>

            {plansLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-96 rounded-2xl bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : paidPlans.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Plans unavailable. Please refresh.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                {paidPlans.map((plan) => {
                  const price =
                    billingCycle === "monthly"
                      ? plan.priceMonthlyPaise
                      : plan.priceYearlyPaise;
                  const isCurrent =
                    subscription?.plan.slug === plan.slug &&
                    subscription.status === "ACTIVE";
                  const isPopular = plan.slug === "growth";
                  const feats = (plan.features ?? {}) as Record<
                    string,
                    boolean
                  >;

                  const benefits = [
                    {
                      label: plan.maxSpaces
                        ? `${plan.maxSpaces} space${plan.maxSpaces > 1 ? "s" : ""}`
                        : "Unlimited spaces",
                      ok: true,
                    },
                    {
                      label: plan.maxStaff
                        ? `${plan.maxStaff} staff accounts`
                        : "Unlimited staff",
                      ok: true,
                    },
                    {
                      label: plan.analyticsDays
                        ? `${plan.analyticsDays}-day analytics`
                        : "Unlimited analytics",
                      ok: true,
                    },
                    {
                      label: "Duty & shift tracking",
                      ok: !!feats.dutyTracking,
                    },
                    {
                      label: "Staff performance reports",
                      ok: !!feats.staffPerformance,
                    },
                    { label: "Amount override", ok: !!feats.amountOverride },
                    { label: "Priority support", ok: !!feats.prioritySupport },
                  ];

                  return (
                    <div
                      key={plan.planId}
                      className={cn(
                        "relative rounded-2xl border flex flex-col overflow-hidden transition-all duration-300",
                        isPopular
                          ? "border-primary/50 shadow-[0_0_40px_rgba(212,160,23,0.08)]"
                          : "border-border hover:border-primary/25",
                      )}
                    >
                      {/* Popular banner */}
                      {isPopular && (
                        <div className="bg-primary px-4 py-1.5 text-center">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-foreground">
                            Most Popular
                          </span>
                        </div>
                      )}

                      <div className="p-6 flex flex-col flex-1 gap-5">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-[0.15em]",
                              isPopular
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          >
                            {plan.name}
                          </span>
                          {isCurrent && (
                            <Badge className="text-[9px] bg-primary/15 text-primary border-0">
                              Current
                            </Badge>
                          )}
                        </div>

                        {/* Price */}
                        <div>
                          <div className="flex items-end gap-1.5">
                            <span className="font-heading font-black text-4xl text-foreground leading-none tabular-nums">
                              {price
                                ? `₹${(price / 100).toLocaleString("en-IN")}`
                                : "—"}
                            </span>
                            <span className="text-xs text-muted-foreground mb-0.5">
                              /{billingCycle === "monthly" ? "mo" : "yr"}
                            </span>
                          </div>
                          {billingCycle === "yearly" &&
                            plan.priceMonthlyPaise && (
                              <p className="text-[11px] text-muted-foreground mt-1">
                                ≈ ₹
                                {Math.round(
                                  (plan.priceYearlyPaise ?? 0) / 100 / 12,
                                ).toLocaleString("en-IN")}
                                /mo
                              </p>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-border" />

                        {/* Benefits list */}
                        <div className="space-y-2.5 flex-1">
                          {benefits.map(({ label, ok }) => (
                            <div
                              key={label}
                              className={cn(
                                "flex items-center gap-2.5 text-xs",
                                ok
                                  ? "text-foreground"
                                  : "text-muted-foreground/35",
                              )}
                            >
                              {ok ? (
                                <IconCheck
                                  size={13}
                                  className="text-primary shrink-0"
                                />
                              ) : (
                                <IconX size={13} className="shrink-0" />
                              )}
                              <span>{label}</span>
                            </div>
                          ))}
                        </div>

                        {/* CTA */}
                        <button
                          type="button"
                          disabled={isCurrent}
                          onClick={() => {
                            setSelectedPlan(plan);
                            setPayDialogOpen(true);
                          }}
                          className={cn(
                            "w-full h-10 rounded-xl text-sm font-semibold transition-all duration-200",
                            isCurrent
                              ? "bg-primary/10 text-primary cursor-default"
                              : isPopular
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]"
                                : "border border-border text-foreground hover:border-primary/40 hover:bg-muted/40 active:scale-[0.98]",
                          )}
                        >
                          {isCurrent ? "Current Plan" : "Get Started"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-4 space-y-2">
          {requests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center space-y-1.5">
              <IconReceipt
                size={22}
                className="text-muted-foreground/50 mx-auto"
              />
              <p className="text-xs text-muted-foreground">
                No subscription requests yet
              </p>
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req.subscriptionRequestId}
                className="flex items-center justify-between p-3.5 rounded-xl border border-border/60"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{req.plan.name}</span>
                    <span className="text-xs text-muted-foreground">
                      · {req.billingCycle.toLowerCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {fmtDate(req.createdAt)}
                  </p>
                  {req.reviewNotes && (
                    <p className="text-xs text-muted-foreground italic">
                      &ldquo;{req.reviewNotes}&rdquo;
                    </p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] shrink-0",
                    REQUEST_STATUS[req.status],
                  )}
                >
                  {req.status.charAt(0) + req.status.slice(1).toLowerCase()}
                </Badge>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {selectedPlan && (
        <UpiPaymentDialog
          plan={selectedPlan}
          billingCycle={billingCycle.toUpperCase() as "MONTHLY" | "YEARLY"}
          open={payDialogOpen}
          onOpenChange={setPayDialogOpen}
          onPaymentSubmitted={() => {
            setPayDialogOpen(false);
            mutateReqs();
            mutateSub();
          }}
        />
      )}
    </div>
  );
}
