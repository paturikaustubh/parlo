"use client";

import { useState, useRef, useEffect } from "react";
import QRCode from "react-qr-code";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import { IconX, IconPhoto } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface Plan {
  planId: string;
  name: string;
  slug: string;
  priceMonthlyPaise: number | null;
  priceYearlyPaise: number | null;
}

interface Props {
  plan: Plan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentSubmitted: () => void;
  billingCycle?: "MONTHLY" | "YEARLY"; // controlled — hides internal toggle when provided
}

export function UpiPaymentDialog({
  plan,
  open,
  onOpenChange,
  onPaymentSubmitted,
  billingCycle: controlledCycle,
}: Props) {
  const [internalCycle, setInternalCycle] = useState<"MONTHLY" | "YEARLY">(
    "MONTHLY",
  );
  const cycle = controlledCycle ?? internalCycle;

  const [upiContent, setUpiContent] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch<{ content: string }>("/settings/upi-qr")
      .then((d) => setUpiContent(d.content))
      .catch(() => {});
  }, []);

  const monthlyRupees = plan.priceMonthlyPaise
    ? plan.priceMonthlyPaise / 100
    : 0;
  const yearlyRupees = plan.priceYearlyPaise ? plan.priceYearlyPaise / 100 : 0;
  const displayAmount = cycle === "MONTHLY" ? monthlyRupees : yearlyRupees;
  const displaySuffix = cycle === "MONTHLY" ? "/mo" : "/yr";

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showToast("Please upload a JPG, PNG, or WEBP image.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("File must be under 5MB.", "error");
      return;
    }
    setProofFile(file);
    setProofPreview(URL.createObjectURL(file));
    e.target.value = "";
  }

  function clearProof() {
    setProofFile(null);
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    setProofPreview(null);
  }

  async function uploadProof(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "payment-proof");
    const res = await fetch("/api/uploads", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      },
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json();
    const url = json.data?.url ?? json.url;
    if (!url) throw new Error("Upload succeeded but no URL returned");
    return url;
  }

  async function handleSubmit() {
    if (!proofFile) {
      showToast("Please upload your payment screenshot.", "error");
      return;
    }
    setUploading(true);
    let proofUrl: string;
    try {
      proofUrl = await uploadProof(proofFile);
    } catch {
      showToast("Failed to upload screenshot. Please try again.", "error");
      setUploading(false);
      return;
    }
    setUploading(false);
    setSubmitting(true);
    try {
      await apiFetch("/subscription-requests", {
        method: "POST",
        body: JSON.stringify({
          planId: plan.planId,
          billingCycle: cycle,
          paymentProofUrl: proofUrl,
        }),
      });
      showToast(
        "Payment submitted. We'll verify and activate your plan shortly.",
        "success",
      );
      onOpenChange(false);
      onPaymentSubmitted();
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to submit. Please try again.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isLoading = uploading || submitting;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isLoading) {
          onOpenChange(v);
          if (!v) {
            clearProof();
            setInternalCycle("MONTHLY");
          }
        }
      }}
    >
      <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden max-h-[90dvh] overflow-y-auto">
        <div className="bg-primary/8 border-b border-primary/15 px-6 pt-6 pb-5">
          <DialogHeader>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-1">
              Activate Plan
            </p>
            <DialogTitle className="font-heading font-bold text-xl text-foreground">
              {plan.name}
            </DialogTitle>
          </DialogHeader>

          {!controlledCycle && (
            <div className="flex gap-2 mt-4">
              {(["MONTHLY", "YEARLY"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setInternalCycle(c)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 text-center",
                    internalCycle === c
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-background/60 text-muted-foreground hover:text-foreground border border-border hover:border-primary/30",
                  )}
                >
                  {c === "MONTHLY" ? (
                    "Monthly"
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      Yearly{" "}
                      <span className="text-[9px] font-bold bg-green-500/20 text-green-600 dark:text-green-400 px-1 rounded">
                        −17%
                      </span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Amount due
            </p>
            <div className="flex items-end justify-center gap-1">
              <span className="font-heading font-black text-4xl text-foreground leading-none">
                ₹{displayAmount.toLocaleString("en-IN")}
              </span>
              <span className="text-sm text-muted-foreground mb-0.5">
                {displaySuffix}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground font-medium">
              Scan with any UPI app to pay
            </p>
            <div className="p-3 rounded-2xl border-2 border-border bg-white">
              {upiContent ? (
                <QRCode value={upiContent} size={176} level="M" />
              ) : (
                <div className="w-44 h-44 rounded-lg bg-muted animate-pulse" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Google Pay · PhonePe · Paytm · BHIM
            </p>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Upload payment screenshot <span className="text-primary">*</span>
            </p>
            {proofPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proofPreview}
                  alt="Payment proof"
                  className="w-full max-h-40 object-cover"
                />
                <button
                  type="button"
                  onClick={clearProof}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center"
                >
                  <IconX size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-16 rounded-xl border border-dashed border-border flex items-center justify-center gap-2 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
              >
                <IconPhoto size={16} />
                Tap to upload screenshot
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          <Button
            className="w-full h-12 text-sm font-semibold rounded-xl"
            disabled={isLoading || !proofFile}
            onClick={handleSubmit}
          >
            {uploading
              ? "Uploading…"
              : submitting
                ? "Submitting…"
                : "Submit Payment"}
          </Button>

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            We'll verify your payment and activate your account within a few
            hours.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
