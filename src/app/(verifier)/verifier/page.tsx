"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconClipboardCheck,
  IconBuilding,
  IconCreditCard,
  IconArrowRight,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";

interface Counts {
  registrations: number;
  payments: number;
}

export default function VerifierDashboardPage() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    async function load() {
      const [regsRes, paymentsRes] = await Promise.allSettled([
        apiFetch<{ data: unknown[]; total: number }>(
          "/verifier/registrations?status=PENDING&pageSize=1",
        ),
        apiFetch<{ data: unknown[]; total: number }>(
          "/verifier/subscription-requests?status=PENDING&pageSize=1",
        ),
      ]);
      setCounts({
        registrations: regsRes.status === "fulfilled" ? regsRes.value.total : 0,
        payments:
          paymentsRes.status === "fulfilled" ? paymentsRes.value.total : 0,
      });
    }
    load();
  }, []);

  const total = (counts?.registrations ?? 0) + (counts?.payments ?? 0);

  const QUEUE_ITEMS = [
    {
      label: "Business registrations",
      icon: IconBuilding,
      count: counts?.registrations,
      href: "/verifier/reviews",
    },
    {
      label: "Payment confirmations",
      icon: IconCreditCard,
      count: counts?.payments,
      href: "/verifier/reviews",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
            Verifier Dashboard
          </h1>
          <Badge
            variant="outline"
            className="text-muted-foreground border-border text-[10px] font-semibold uppercase tracking-wider"
          >
            Verifier
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Review business registrations and confirm subscription payments.
        </p>
      </div>

      {/* Hero CTA */}
      <Card className="border-primary/20 bg-primary/5 overflow-hidden">
        <CardContent className="px-6 py-8 flex flex-col items-center text-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
              <IconClipboardCheck
                size={30}
                className="text-primary"
                strokeWidth={1.5}
              />
            </div>
            {total > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                {total > 9 ? "9+" : total}
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            <p className="font-heading font-bold text-lg text-foreground">
              {total > 0
                ? `${total} item${total !== 1 ? "s" : ""} need${total === 1 ? "s" : ""} review`
                : "Review Queue"}
            </p>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              {total > 0
                ? "You have pending items waiting for your action."
                : "All caught up — no pending registrations or payments."}
            </p>
          </div>
          <Button asChild className="h-11 px-8 text-sm font-semibold">
            <Link href="/verifier/reviews" className="flex items-center gap-2">
              {total > 0 ? "Review Now" : "View Queue"}
              <IconArrowRight size={15} />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Pending breakdown */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Pending items
        </p>
        <div className="grid grid-cols-2 gap-3">
          {QUEUE_ITEMS.map(({ label, icon: Icon, count, href }) => (
            <Link key={label} href={href}>
              <Card className="border-border hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                      <Icon size={16} className="text-muted-foreground" />
                    </div>
                    {count == null ? (
                      <div className="w-6 h-4 rounded bg-muted animate-pulse" />
                    ) : count > 0 ? (
                      <Badge className="text-[10px] px-1.5 h-5 bg-primary/15 text-primary hover:bg-primary/15 border-0 font-bold">
                        {count}
                      </Badge>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        —
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-foreground leading-snug">
                    {label}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
