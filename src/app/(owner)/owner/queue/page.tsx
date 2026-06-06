"use client";

import { useState, useMemo } from "react";
import { useEffect } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/components/ui/toast";
import { IconListCheck, IconSearch, IconX } from "@tabler/icons-react";
import { CheckoutRequestCard } from "@/components/shared/checkout-request-card";
import { apiFetch } from "@/lib/api-client";
import { pageFetcher } from "@/lib/swr-fetcher";
import { SpaceFilterBanner } from "@/components/owner/space-filter-banner";
import type { CheckoutRequest, Space } from "@/shared/types/entities";
import Fuse from "fuse.js";
import { useSearchParams } from "next/navigation";

interface PaginatedRequests {
  data: CheckoutRequest[];
  total: number;
  page: number;
  pageSize: number;
  lastPage: number;
}

const fuseOptions = {
  keys: [
    { name: "requestCode", weight: 0.4 },
    { name: "sessions.vehicleNumber", weight: 0.3 },
    { name: "userName", weight: 0.2 },
    { name: "userPhone", weight: 0.1 },
  ],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
};

export default function OwnerQueuePage() {
  const searchParams = useSearchParams();
  const spaceIdFromUrl = searchParams.get("space");

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [actionTarget, setActionTarget] = useState<{
    id: string;
    type: "approve" | "reject";
  } | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    apiFetch<Space[]>("/spaces")
      .then(setSpaces)
      .catch(() => {});
  }, []);

  // Pending tab: SWR with 10s polling
  const { data: pendingData, mutate: mutatePending } =
    useSWR<PaginatedRequests>(
      [
        "/checkout/requests",
        {
          status: "PENDING",
          spaceId: spaceIdFromUrl || undefined,
          pageSize: 50,
        },
      ],
      pageFetcher,
      { refreshInterval: 10_000 },
    );

  const pendingList = pendingData?.data ?? [];

  const fusePending = useMemo(
    () => new Fuse(pendingList, fuseOptions),
    [pendingList],
  );

  const filteredPending = query.trim()
    ? fusePending.search(query).map((r) => r.item)
    : pendingList;

  async function handleAction() {
    if (!actionTarget) return;
    setSubmitting(true);
    try {
      const body: Record<string, string> = {
        status: actionTarget.type === "approve" ? "APPROVED" : "REJECTED",
      };
      if (actionTarget.type === "reject" && rejectNote.trim()) {
        body.reason = rejectNote.trim();
      }
      await apiFetch(`/checkout/requests/${actionTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      showToast(
        actionTarget.type === "approve"
          ? "Request approved."
          : "Request rejected.",
        "success",
      );
      setActionTarget(null);
      setRejectNote("");
      mutatePending();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const spaceName = spaces.find((s) => s.spaceId === spaceIdFromUrl)?.name;

  return (
    <div className="space-y-5">
      <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
        Requests
      </h1>

      <SpaceFilterBanner spaceName={spaceName} />

      {/* Search */}
      <div className="relative">
        <IconSearch
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          placeholder="Search by code, plate, name or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 pr-8 text-sm h-9"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <IconX size={14} />
          </button>
        )}
      </div>

      <div className="mt-4">
        {!pendingData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredPending.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <IconListCheck
              size={32}
              className="text-muted-foreground mx-auto"
            />
            <p className="text-sm text-muted-foreground">No pending requests</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredPending.map((req) => (
              <CheckoutRequestCard
                key={req.checkoutRequestId}
                req={req}
                onApprove={() =>
                  setActionTarget({
                    id: req.checkoutRequestId,
                    type: "approve",
                  })
                }
                onReject={() =>
                  setActionTarget({
                    id: req.checkoutRequestId,
                    type: "reject",
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Action dialog */}
      <Dialog
        open={!!actionTarget}
        onOpenChange={(o) => {
          if (!o) {
            setActionTarget(null);
            setRejectNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionTarget?.type === "approve"
                ? "Approve request?"
                : "Reject request"}
            </DialogTitle>
          </DialogHeader>
          {actionTarget?.type === "reject" && (
            <div className="py-2">
              <Textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Reason (optional)"
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionTarget(null);
                setRejectNote("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={submitting}
              onClick={handleAction}
              className={
                actionTarget?.type === "reject"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {submitting
                ? "Processing…"
                : actionTarget?.type === "approve"
                  ? "Approve"
                  : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
