"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import {
  IconSearch,
  IconBuildingStore,
  IconCheck,
  IconChevronRight,
  IconLoader2,
  IconMapPin,
} from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface Business {
  businessId: string;
  name: string;
}

interface Space {
  spaceId: string;
  name: string;
  address?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STEPS = ["Find Business", "Select Space", "Details"] as const;

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

export function ApplyStaffSheet({ open, onOpenChange, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(
    null,
  );
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null); // null = all spaces
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedBusiness(null);
      setSpaces([]);
      setSelectedSpaceId(null);
      setNotes("");
      setSearchQuery("");
      setBusinesses([]);
    }
  }, [open]);

  // Fetch spaces when business is selected and step moves to 2
  useEffect(() => {
    if (step === 2 && selectedBusiness) {
      setLoadingSpaces(true);
      apiFetch<Space[]>(`/businesses/${selectedBusiness.businessId}/spaces`)
        .then(setSpaces)
        .catch(() => setSpaces([]))
        .finally(() => setLoadingSpaces(false));
    }
  }, [step, selectedBusiness]);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const data = await apiFetch<Business[]>(
        `/businesses?search=${encodeURIComponent(searchQuery)}`,
      );
      setBusinesses(data);
      if (data.length === 0) showToast("No matching businesses found.", "info");
    } catch {
      showToast("Failed to search for businesses.", "error");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSubmit() {
    if (!selectedBusiness) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`/staff-requests`, {
        method: "POST",
        body: JSON.stringify({
          businessId: selectedBusiness.businessId,
          spaceId: selectedSpaceId ?? undefined,
          notes: notes.trim() || undefined,
        }),
      });
      showToast("Application submitted successfully!", "success");
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Submission failed.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[92vh] flex flex-col overflow-hidden p-0"
      >
        <SheetHeader className="shrink-0 px-5 pt-5 pb-4 border-b border-border/60">
          <SheetTitle className="font-heading font-bold text-lg text-foreground tracking-tight mb-4">
            Apply as Staff
          </SheetTitle>

          {/* Step indicator */}
          <div className="flex items-center gap-0">
            {STEPS.map((label, i) => {
              const idx = i + 1;
              const done = step > idx;
              const active = step === idx;
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
                        step > idx ? "bg-primary" : "bg-border",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-5">
          {/* Step 1 — Find Business */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <FieldLabel required>Search Business</FieldLabel>
                <div className="relative group">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search by name..."
                    className="h-12 text-sm pr-12"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1 h-10 w-10 rounded-md"
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                  >
                    {isSearching ? (
                      <IconLoader2 className="animate-spin" size={18} />
                    ) : (
                      <IconSearch size={18} />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Results
                </p>
                {businesses.length === 0 && !isSearching && (
                  <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-border bg-muted/20">
                    <IconBuildingStore
                      size={32}
                      className="mx-auto mb-3 text-muted-foreground/40"
                    />
                    <p className="text-sm text-muted-foreground">
                      Search for a business to see available opportunities.
                    </p>
                  </div>
                )}
                <div className="grid gap-2">
                  {businesses.map((b) => (
                    <button
                      key={b.businessId}
                      onClick={() => setSelectedBusiness(b)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all text-left group",
                        selectedBusiness?.businessId === b.businessId
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:border-primary/50 hover:bg-muted/50",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            selectedBusiness?.businessId === b.businessId
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <IconBuildingStore size={16} />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {b.name}
                        </p>
                      </div>
                      <IconChevronRight
                        size={16}
                        className={cn(
                          "transition-transform group-hover:translate-x-1",
                          selectedBusiness?.businessId === b.businessId
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Select Space */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-border bg-muted/30 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <IconBuildingStore size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Applying to
                  </p>
                  <p className="text-sm font-bold text-foreground truncate">
                    {selectedBusiness?.name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  onClick={() => setStep(1)}
                >
                  Change
                </Button>
              </div>

              <div>
                <FieldLabel>Preferred space</FieldLabel>
                {loadingSpaces ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-14 rounded-xl bg-muted animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {/* All spaces option */}
                    <button
                      type="button"
                      onClick={() => setSelectedSpaceId(null)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        selectedSpaceId === null
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:border-primary/50 hover:bg-muted/50",
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          selectedSpaceId === null
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <IconMapPin size={15} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          All spaces
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          No preference — open to any space
                        </p>
                      </div>
                    </button>

                    {spaces.map((sp) => (
                      <button
                        key={sp.spaceId}
                        type="button"
                        onClick={() => setSelectedSpaceId(sp.spaceId)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                          selectedSpaceId === sp.spaceId
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border bg-card hover:border-primary/50 hover:bg-muted/50",
                        )}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            selectedSpaceId === sp.spaceId
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <IconMapPin size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {sp.name}
                          </p>
                          {sp.address && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {sp.address}
                            </p>
                          )}
                        </div>
                        {selectedSpaceId === sp.spaceId && (
                          <IconCheck
                            size={15}
                            className="text-primary shrink-0"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3 — Notes */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl border border-border bg-muted/30 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <IconBuildingStore size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Applying to
                  </p>
                  <p className="text-sm font-bold text-foreground truncate">
                    {selectedBusiness?.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <IconMapPin size={10} />
                    {selectedSpaceId
                      ? spaces.find((s) => s.spaceId === selectedSpaceId)?.name
                      : "All spaces"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel>Cover Note (Optional)</FieldLabel>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tell the business why you'd be a great addition to their team..."
                  rows={5}
                  className="text-sm resize-none"
                />
              </div>

              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30">
                <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                  Your application will be sent to the business owner. They will
                  contact you via the phone number in your account profile.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 py-4 border-t border-border/60 bg-background">
          <div className="flex gap-3">
            {step > 1 && (
              <Button
                variant="outline"
                className="flex-1 h-12 text-sm font-medium"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                className="flex-1 h-12 text-sm font-semibold"
                disabled={step === 1 && !selectedBusiness}
                onClick={() => setStep((s) => s + 1)}
              >
                Continue
              </Button>
            ) : (
              <Button
                className="flex-1 h-12 text-sm font-semibold"
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <>
                    <IconLoader2 className="animate-spin mr-2" size={16} />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
