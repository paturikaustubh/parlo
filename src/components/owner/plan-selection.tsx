"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/ui/toast";
import { UpiPaymentDialog } from "./upi-payment-dialog";
import { apiFetch } from "@/lib/api-client";
import { IconSparkles, IconArrowRight, IconCheck } from "@tabler/icons-react";
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

interface Props {
  onActivated: () => void;
  demoUsed?: boolean;
}

function getPlanFeatures(plan: Plan): string[] {
  const features: string[] = [];
  features.push(
    plan.maxSpaces
      ? `${plan.maxSpaces} space${plan.maxSpaces > 1 ? "s" : ""}`
      : "Unlimited spaces",
  );
  features.push(plan.maxStaff ? `${plan.maxStaff} staff` : "Unlimited staff");
  features.push(
    plan.analyticsDays
      ? `${plan.analyticsDays}-day analytics`
      : "Unlimited analytics",
  );
  if (plan.features?.staffPerformance) features.push("Staff performance");
  if (plan.features?.prioritySupport) features.push("Priority support");
  return features;
}

export function PlanSelection({ onActivated, demoUsed = false }: Props) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingDemo, setActivatingDemo] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);

  useEffect(() => {
    apiFetch<Plan[]>("/plans")
      .then((data) =>
        setPlans(
          data.filter((p) => p.slug !== "demo" && p.slug !== "enterprise"),
        ),
      )
      .catch(() => showToast("Failed to load plans.", "error"))
      .finally(() => setLoading(false));
  }, []);

  async function handleStartDemo() {
    setActivatingDemo(true);
    try {
      const allPlans = await apiFetch<Plan[]>("/plans");
      const demoPlan = allPlans.find((p) => p.slug === "demo");
      if (!demoPlan) throw new Error("Demo plan not found");

      await apiFetch("/subscription-requests", {
        method: "POST",
        body: JSON.stringify({
          planId: demoPlan.planId,
          billingCycle: "MONTHLY",
        }),
      });
      showToast("Demo started! You have 14 days of full access.", "success");
      onActivated();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to start demo.",
        "error",
      );
    } finally {
      setActivatingDemo(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Choose a plan
      </p>

      {/* Demo card */}
      <button
        type="button"
        disabled={demoUsed || activatingDemo}
        onClick={handleStartDemo}
        className={cn(
          "w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 group",
          demoUsed
            ? "border-border opacity-40 cursor-not-allowed"
            : "border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary/8",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/25 transition-colors">
              <IconSparkles size={15} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {activatingDemo ? "Starting demo…" : "Start with Demo"}
                </span>
                <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary/15 text-primary hover:bg-primary/15 border-0">
                  Free
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {demoUsed
                  ? "Demo already used for this business"
                  : "14 days · Full Pro features · No payment"}
              </p>
            </div>
          </div>
          {!demoUsed && (
            <IconArrowRight
              size={16}
              className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1 shrink-0"
            />
          )}
        </div>
      </button>

      {/* Paid plans */}
      <div className="space-y-2">
        {plans.map((plan) => {
          const features = getPlanFeatures(plan);
          const monthly = Math.round((plan.priceMonthlyPaise ?? 0) / 100);
          return (
            <button
              key={plan.planId}
              type="button"
              onClick={() => {
                setSelectedPlan(plan);
                setPayDialogOpen(true);
              }}
              className="w-full text-left p-4 rounded-2xl border border-border hover:border-primary/40 hover:bg-muted/30 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-sm font-semibold text-foreground">
                  {plan.name}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-heading font-bold text-base text-primary">
                    ₹{monthly}
                  </span>
                  <span className="text-[11px] text-muted-foreground">/mo</span>
                  <IconArrowRight
                    size={14}
                    className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {features.map((f) => (
                  <span
                    key={f}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground"
                  >
                    <IconCheck size={10} className="text-primary/60 shrink-0" />
                    {f}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {selectedPlan && (
        <UpiPaymentDialog
          plan={selectedPlan}
          open={payDialogOpen}
          onOpenChange={setPayDialogOpen}
          onPaymentSubmitted={onActivated}
        />
      )}
    </div>
  );
}
