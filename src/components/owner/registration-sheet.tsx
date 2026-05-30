"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import { IconUpload, IconX, IconFile, IconCheck } from "@tabler/icons-react";
import QRCode from "react-qr-code";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { BusinessRegistration } from "@/shared/types/entities";

const DOCUMENT_CATEGORIES = [
  "Aadhar Card",
  "PAN Card",
  "GST Certificate",
  "Business License",
  "Business Insurance",
  "Bank Statement",
  "Trade License",
  "Proprietorship Deed",
  "Other",
] as const;

const SPACE_TYPES = [
  "Parking Lot",
  "Garage",
  "Mall Parking",
  "Street Parking",
  "Other",
] as const;

const STEPS = [
  "Business",
  "Space",
  "Documents",
  "Plan",
  "Payment",
  "Review",
] as const;

interface DocumentEntry {
  category: string;
  fileName: string;
  url: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (registration: BusinessRegistration) => void;
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
      {children}
      {required && <span className="text-primary ml-1">*</span>}
    </label>
  );
}

export function RegistrationSheet({ open, onOpenChange, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [spaceType, setSpaceType] = useState("");
  const [spaceName, setSpaceName] = useState("");
  const [spaceAddress, setSpaceAddress] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [aadharDoc, setAadharDoc] = useState<DocumentEntry | null>(null);
  const [extraDocs, setExtraDocs] = useState<DocumentEntry[]>([]);
  const [extraCategory, setExtraCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [plans, setPlans] = useState<
    Array<{
      planId: string;
      name: string;
      slug: string;
      priceMonthlyPaise: number | null;
      priceYearlyPaise: number | null;
      maxSpaces: number | null;
      maxStaff: number | null;
      analyticsDays: number | null;
      features: Record<string, boolean>;
    }>
  >([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    "MONTHLY",
  );
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState<string>("");
  const [upiContent, setUpiContent] = useState<string | null>(null);

  function resetAll() {
    setStep(1);
    setBusinessName("");
    setSpaceType("");
    setSpaceName("");
    setSpaceAddress("");
    setLicenseNumber("");
    setGstNumber("");
    setAadharDoc(null);
    setExtraDocs([]);
    setExtraCategory("");
    setCustomCategory("");
    setSubmitting(false);
    setSelectedPlanId("");
    setSelectedPlanSlug("");
    setBillingCycle("MONTHLY");
    setProofFile(null);
    setProofPreview(null);
    setProofUrl("");
  }

  useEffect(() => {
    if (!open) return;
    if (plans.length === 0) {
      setPlansLoading(true);
      apiFetch<
        Array<{
          planId: string;
          name: string;
          slug: string;
          priceMonthlyPaise: number | null;
          priceYearlyPaise: number | null;
          maxSpaces: number | null;
          maxStaff: number | null;
          analyticsDays: number | null;
          features: Record<string, boolean>;
        }>
      >("/plans")
        .then((data) => setPlans(data.filter((p) => p.slug !== "enterprise")))
        .catch(() => showToast("Failed to load plans.", "error"))
        .finally(() => setPlansLoading(false));
    }
    if (!upiContent) {
      apiFetch<{ content: string }>("/settings/upi-qr")
        .then((d) => setUpiContent(d.content))
        .catch(() => {});
    }
  }, [open]);

  function handleOpenChange(val: boolean) {
    if (!val && step > 1) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(val);
      if (!val) resetAll();
    }
  }

  async function uploadFile(
    file: File,
  ): Promise<{ url: string; fileName: string }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "business-document");
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
    return { url, fileName: file.name };
  }

  async function handleAadharUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url, fileName } = await uploadFile(file);
      setAadharDoc({ category: "Aadhar Card", fileName, url });
    } catch {
      showToast("Failed to upload Aadhar card. Please try again.", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleExtraUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !extraCategory) return;
    const effectiveCategory =
      extraCategory === "Other"
        ? customCategory
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^a-z0-9_]/g, "") || "other"
        : extraCategory;
    setUploading(true);
    try {
      const { url, fileName } = await uploadFile(file);
      setExtraDocs((d) => [
        ...d,
        { category: effectiveCategory, fileName, url },
      ]);
      setExtraCategory("");
      setCustomCategory("");
    } catch {
      showToast("Failed to upload document. Please try again.", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeExtraDoc(index: number) {
    setExtraDocs((d) => d.filter((_, i) => i !== index));
  }

  async function uploadPaymentProof(file: File): Promise<string> {
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

  function handleProofSelect(e: React.ChangeEvent<HTMLInputElement>) {
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

  async function handleSubmit() {
    setSubmitting(true);
    let finalProofUrl = proofUrl;

    if (selectedPlanSlug !== "demo" && proofFile && !proofUrl) {
      try {
        finalProofUrl = await uploadPaymentProof(proofFile);
        setProofUrl(finalProofUrl);
      } catch {
        showToast("Failed to upload payment proof. Please try again.", "error");
        setSubmitting(false);
        return;
      }
    }

    const documentUrls: Record<string, string> = {};
    if (aadharDoc) documentUrls["aadhar_card"] = aadharDoc.url;
    extraDocs.forEach((d) => {
      const key = d.category
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
      documentUrls[key] = d.url;
    });

    try {
      const result = await apiFetch<BusinessRegistration>(
        "/business-registrations",
        {
          method: "POST",
          body: JSON.stringify({
            businessName: businessName.trim(),
            spaceType: spaceType || undefined,
            spaceName: spaceName.trim(),
            spaceAddress: spaceAddress.trim(),
            licenseNumber: licenseNumber.trim() || undefined,
            gstNumber: gstNumber.trim() || undefined,
            documentUrls,
            planId: selectedPlanId,
            billingCycle: selectedPlanSlug === "demo" ? "DEMO" : billingCycle,
            paymentProofUrl:
              selectedPlanSlug !== "demo" ? finalProofUrl : undefined,
          }),
        },
      );
      showToast(
        "Registration submitted! We'll review and get back to you.",
        "success",
      );
      onSuccess(result);
      onOpenChange(false);
      resetAll();
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Submission failed. Please try again.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const step1Valid = businessName.trim().length > 0;
  const step2Valid =
    spaceName.trim().length > 0 &&
    spaceAddress.trim().length > 0 &&
    licenseNumber.trim().length > 0;
  const step3Valid = !!aadharDoc;
  const usedCategories = new Set(extraDocs.map((d) => d.category));

  const isNextDisabled =
    (step === 1 && !step1Valid) ||
    (step === 2 && !step2Valid) ||
    (step === 3 && !step3Valid) ||
    uploading;

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl max-h-[92vh] flex flex-col overflow-hidden p-0"
        >
          {/* ── Header ─────────────────────────────── */}
          <SheetHeader className="shrink-0 px-5 pt-5 pb-4 border-b border-border/60">
            <SheetTitle className="font-heading font-bold text-lg text-foreground tracking-tight mb-4">
              Register a Business
            </SheetTitle>

            {/* Step indicator */}
            <div className="flex items-center gap-0">
              {STEPS.map((label, i) => {
                const idx = i + 1;
                const done = idx < step;
                const active = idx === step;
                return (
                  <div
                    key={label}
                    className="flex items-center flex-1 last:flex-none"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
                          done
                            ? "bg-primary text-primary-foreground"
                            : active
                              ? "bg-primary/15 border-2 border-primary text-primary"
                              : "bg-muted text-muted-foreground border border-border",
                        )}
                      >
                        {done ? <IconCheck size={11} strokeWidth={3} /> : idx}
                      </div>
                      <span
                        className={cn(
                          "text-[9px] font-medium uppercase tracking-wider",
                          active
                            ? "text-primary"
                            : done
                              ? "text-muted-foreground"
                              : "text-muted-foreground/50",
                        )}
                      >
                        {label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "flex-1 h-px mx-1.5 mb-3 transition-all",
                          idx < step ? "bg-primary" : "bg-border",
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </SheetHeader>

          {/* ── Scrollable content ─────────────────── */}
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-5">
            {/* Step 1 — Business details */}
            {step === 1 && (
              <>
                <div>
                  <FieldLabel required>Business name</FieldLabel>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="ABC Parking Pvt. Ltd."
                    className="h-12 text-sm"
                    autoFocus
                  />
                </div>
              </>
            )}

            {/* Step 2 — Space details */}
            {step === 2 && (
              <>
                <div>
                  <FieldLabel required>Space name</FieldLabel>
                  <Input
                    value={spaceName}
                    onChange={(e) => setSpaceName(e.target.value)}
                    placeholder="Main Parking Lot"
                    className="h-12 text-sm"
                  />
                </div>
                <div>
                  <FieldLabel required>Space address</FieldLabel>
                  <Textarea
                    value={spaceAddress}
                    onChange={(e) => setSpaceAddress(e.target.value)}
                    placeholder="123, MG Road, Bengaluru, Karnataka - 560001"
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>
                <div>
                  <FieldLabel required>License number</FieldLabel>
                  <Input
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="LIC-2024-XXXXX"
                    className="h-12 text-sm font-mono"
                  />
                </div>
                <div>
                  <FieldLabel>GST number</FieldLabel>
                  <Input
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="29AAAAA0000A1Z5"
                    className="h-12 text-sm font-mono uppercase"
                  />
                </div>
                <div>
                  <FieldLabel>Space type</FieldLabel>
                  <Select value={spaceType} onValueChange={setSpaceType}>
                    <SelectTrigger className="h-12 text-sm">
                      <SelectValue placeholder="Select type (optional)" />
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
              </>
            )}

            {/* Step 3 — Documents */}
            {step === 3 && (
              <>
                {/* Aadhar — required */}
                <div>
                  <FieldLabel required>Aadhar Card</FieldLabel>
                  {aadharDoc ? (
                    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-primary/30 bg-primary/5">
                      <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                        <IconFile size={16} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-0.5">
                          Uploaded
                        </p>
                        <p className="text-sm text-foreground truncate">
                          {aadharDoc.fileName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAadharDoc(null)}
                        className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <IconX size={13} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/3 cursor-pointer transition-all group">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                        <IconUpload
                          size={18}
                          className="text-muted-foreground group-hover:text-primary transition-colors"
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">
                          {uploading ? "Uploading…" : "Upload Aadhar Card"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          JPG, PNG or PDF · Max 10MB
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={handleAadharUpload}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>

                {/* Uploaded extra docs */}
                {extraDocs.length > 0 && (
                  <div className="space-y-2">
                    <FieldLabel>Additional documents</FieldLabel>
                    {extraDocs.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20"
                      >
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <IconFile
                            size={14}
                            className="text-muted-foreground"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider capitalize">
                            {d.category.replace(/_/g, " ")}
                          </p>
                          <p className="text-sm text-foreground truncate">
                            {d.fileName}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExtraDoc(i)}
                          className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <IconX size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add extra doc */}
                <div className="space-y-2.5 pt-1">
                  <FieldLabel>Add another document</FieldLabel>
                  <Select
                    value={extraCategory}
                    onValueChange={setExtraCategory}
                  >
                    <SelectTrigger className="h-11 text-sm">
                      <SelectValue placeholder="Select category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.filter(
                        (c) => c !== "Aadhar Card" && !usedCategories.has(c),
                      ).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {extraCategory === "Other" && (
                    <Input
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g. Insurance Certificate"
                      className="h-11 text-sm"
                    />
                  )}
                  {extraCategory &&
                    (extraCategory !== "Other" || customCategory.trim()) && (
                      <label className="flex items-center justify-center gap-2.5 py-3 rounded-xl border border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors group">
                        <IconUpload
                          size={15}
                          className="text-muted-foreground group-hover:text-primary transition-colors"
                        />
                        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                          {uploading ? "Uploading…" : "Upload file"}
                        </span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={handleExtraUpload}
                          disabled={uploading}
                        />
                      </label>
                    )}
                </div>
              </>
            )}

            {/* Step 4 — Plan */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Choose a plan
                  </p>
                  <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted text-xs">
                    {(["MONTHLY", "YEARLY"] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBillingCycle(c)}
                        className={cn(
                          "px-2.5 py-1 rounded-md transition-colors",
                          billingCycle === c
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground",
                        )}
                      >
                        {c === "YEARLY" ? (
                          <span className="flex items-center gap-1">
                            Yearly
                            <span className="text-[9px] font-bold text-primary">
                              −17%
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
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-72 rounded-2xl bg-muted animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Paid plans — 3-column grid matching subscription page */}
                    <div className="grid grid-cols-3 gap-3 items-start">
                      {plans
                        .filter((p) => p.slug !== "demo")
                        .map((plan) => {
                          const isSelected = selectedPlanId === plan.planId;
                          const isPopular = plan.slug === "growth";
                          const price =
                            billingCycle === "MONTHLY"
                              ? plan.priceMonthlyPaise
                              : plan.priceYearlyPaise;
                          const feats = (plan.features ?? {}) as Record<
                            string,
                            boolean
                          >;
                          const benefits = [
                            {
                              label: `${plan.maxSpaces ?? "Unlimited"} spaces`,
                              ok: true,
                            },
                            {
                              label: `${plan.maxStaff ?? "Unlimited"} staff`,
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
                              label: "Staff performance",
                              ok: !!feats.staffPerformance,
                            },
                            {
                              label: "Amount override",
                              ok: !!feats.amountOverride,
                            },
                            {
                              label: "Priority support",
                              ok: !!feats.prioritySupport,
                            },
                          ];
                          return (
                            <div
                              key={plan.planId}
                              className={cn(
                                "relative rounded-2xl border-2 flex flex-col overflow-hidden transition-all duration-200 cursor-pointer",
                                isSelected
                                  ? "border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.3),0_8px_24px_hsl(var(--primary)/0.15)]"
                                  : "border-border hover:border-border/60",
                              )}
                              onClick={() => {
                                setSelectedPlanId(plan.planId);
                                setSelectedPlanSlug(plan.slug);
                              }}
                            >
                              {isSelected && (
                                <div className="absolute top-3 right-3">
                                  <IconCheck
                                    size={16}
                                    className="text-primary"
                                  />
                                </div>
                              )}
                              <div className="p-4 flex flex-col flex-1 gap-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                                    {plan.name}
                                  </span>
                                  {isPopular && (
                                    <span className="text-[8px] font-black uppercase tracking-wide bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                                      Popular
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-end gap-1">
                                  <span className="font-heading font-black text-2xl text-foreground leading-none tabular-nums">
                                    {price
                                      ? `₹${(price / 100).toLocaleString("en-IN")}`
                                      : "—"}
                                  </span>
                                  <span className="text-xs text-muted-foreground mb-0.5">
                                    /{billingCycle === "MONTHLY" ? "mo" : "yr"}
                                  </span>
                                </div>
                                <div className="h-px bg-border" />
                                <div className="space-y-2 flex-1">
                                  {benefits.map(({ label, ok }) => (
                                    <div
                                      key={label}
                                      className={cn(
                                        "flex items-center gap-2 text-xs",
                                        ok
                                          ? "text-foreground"
                                          : "text-muted-foreground/35",
                                      )}
                                    >
                                      {ok ? (
                                        <IconCheck
                                          size={12}
                                          className="text-primary shrink-0"
                                        />
                                      ) : (
                                        <IconX size={12} className="shrink-0" />
                                      )}
                                      <span>{label}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Demo plan — compact horizontal row */}
                    {plans
                      .filter((p) => p.slug === "demo")
                      .map((plan) => {
                        const isSelected = selectedPlanId === plan.planId;
                        return (
                          <button
                            key={plan.planId}
                            type="button"
                            onClick={() => {
                              setSelectedPlanId(plan.planId);
                              setSelectedPlanSlug(plan.slug);
                            }}
                            className={cn(
                              "w-full text-left p-4 rounded-2xl border-2 transition-all",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/30",
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground">
                                    {plan.name}
                                  </span>
                                  <span className="text-[9px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                                    Free trial
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  14 days · All Pro features · No payment needed
                                </p>
                              </div>
                              {isSelected && (
                                <IconCheck
                                  size={15}
                                  className="text-primary shrink-0"
                                />
                              )}
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(3)}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!selectedPlanId}
                    onClick={() => setStep(selectedPlanSlug === "demo" ? 6 : 5)}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5 — Payment */}
            {step === 5 && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    Payment proof
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Complete payment via UPI and upload a screenshot.
                  </p>
                  <div className="flex flex-col items-center gap-2 mb-4">
                    <div className="p-3 rounded-2xl border-2 border-border bg-white">
                      {upiContent ? (
                        <QRCode value={upiContent} size={160} level="M" />
                      ) : (
                        <div className="w-40 h-40 rounded-lg bg-muted animate-pulse" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Google Pay · PhonePe · Paytm · BHIM
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Upload screenshot <span className="text-primary">*</span>
                    </p>
                    {proofPreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={proofPreview}
                          alt="Payment proof"
                          className="w-full max-h-48 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setProofFile(null);
                            setProofPreview(null);
                            setProofUrl("");
                          }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center"
                        >
                          <IconX size={12} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/40 cursor-pointer transition-colors">
                        <IconUpload
                          size={20}
                          className="text-muted-foreground"
                        />
                        <span className="text-xs text-muted-foreground">
                          Tap to upload payment screenshot
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleProofSelect}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(4)}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!proofFile}
                    onClick={() => setStep(6)}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 6 — Review */}
            {step === 6 && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-border overflow-hidden">
                  {[
                    { label: "Business name", value: businessName },
                    { label: "Space type", value: spaceType || "—" },
                    { label: "Space name", value: spaceName },
                    { label: "Space address", value: spaceAddress },
                    {
                      label: "License number",
                      value: licenseNumber,
                      mono: true,
                    },
                    {
                      label: "GST number",
                      value: gstNumber || "—",
                      mono: !!gstNumber,
                    },
                  ].map(({ label, value, mono }, i) => (
                    <div
                      key={label}
                      className={cn(
                        "px-4 py-3.5 flex items-start justify-between gap-4",
                        i > 0 && "border-t border-border/60",
                      )}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0 pt-0.5">
                        {label}
                      </span>
                      <span
                        className={cn(
                          "text-sm text-foreground text-right",
                          mono && "font-mono",
                        )}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Documents list */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                    Documents attached
                  </p>
                  <div className="space-y-2">
                    {[aadharDoc, ...extraDocs].filter(Boolean).map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
                      >
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <IconFile size={14} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider capitalize">
                            {d!.category.replace(/_/g, " ")}
                          </p>
                          <p className="text-sm text-foreground truncate">
                            {d!.fileName}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  By submitting, you confirm that all details are accurate. Our
                  team will review within 1–2 business days.
                </p>
              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────── */}
          <div className="shrink-0 px-5 py-4 border-t border-border/60 bg-background">
            <div className="flex gap-3">
              {step > 1 && step !== 4 && step !== 5 && step !== 6 && (
                <Button
                  variant="outline"
                  className="flex-1 h-12 text-sm font-medium"
                  onClick={() => setStep((s) => s - 1)}
                >
                  Back
                </Button>
              )}
              {step === 6 && (
                <Button
                  variant="outline"
                  className="flex-1 h-12 text-sm font-medium"
                  onClick={() => setStep(selectedPlanSlug === "demo" ? 4 : 5)}
                >
                  Back
                </Button>
              )}
              {step < 4 ? (
                <Button
                  className="flex-1 h-12 text-sm font-semibold"
                  disabled={isNextDisabled}
                  onClick={() => setStep((s) => s + 1)}
                >
                  Continue
                </Button>
              ) : step === 6 ? (
                <Button
                  className="flex-1 h-12 text-sm font-semibold"
                  disabled={submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? "Submitting…" : "Submit Registration"}
                </Button>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard registration?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be lost. Uploaded files will need to be
              re-uploaded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCloseConfirm(false);
                onOpenChange(false);
                resetAll();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
