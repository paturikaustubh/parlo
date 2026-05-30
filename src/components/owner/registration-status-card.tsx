"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RegistrationSheet } from "./registration-sheet";
import { PlanSelection } from "./plan-selection";
import type { BusinessRegistration } from "@/shared/types/entities";

interface Props {
  registration: BusinessRegistration;
  onResubmit: (reg: BusinessRegistration) => void;
  onActivated: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REVISION_REQUESTED: "Revision requested",
};

const STATUS_VARIANT: Record<string, "secondary" | "outline" | "destructive"> =
  {
    PENDING: "secondary",
    APPROVED: "outline",
    REJECTED: "destructive",
    REVISION_REQUESTED: "secondary",
  };

export function RegistrationStatusCard({
  registration,
  onResubmit,
  onActivated,
}: Props) {
  const [resubmitOpen, setResubmitOpen] = useState(false);

  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {registration.businessName}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Submitted{" "}
              {new Date(registration.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[registration.status] ?? "secondary"}>
            {STATUS_LABEL[registration.status] ?? registration.status}
          </Badge>
        </div>

        {registration.status === "PENDING" && (
          <p className="text-xs text-muted-foreground">
            Our team is reviewing your registration. This usually takes 1–2
            business days.
          </p>
        )}

        {registration.status === "APPROVED" && (
          <PlanSelection onActivated={onActivated} />
        )}

        {(registration.status === "REJECTED" ||
          registration.status === "REVISION_REQUESTED") && (
          <div className="space-y-2">
            {registration.reviewNotes && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                <p className="text-xs font-medium text-destructive mb-1">
                  {registration.status === "REJECTED"
                    ? "Rejection reason"
                    : "Revision notes"}
                </p>
                <p className="text-sm text-foreground">
                  {registration.reviewNotes}
                </p>
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setResubmitOpen(true)}
            >
              Resubmit Registration
            </Button>
          </div>
        )}
      </CardContent>

      <RegistrationSheet
        open={resubmitOpen}
        onOpenChange={setResubmitOpen}
        onSuccess={onResubmit}
      />
    </Card>
  );
}
