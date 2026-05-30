"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IconArrowLeft,
  IconRadio,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { CheckoutRequestCard } from "@/components/shared/checkout-request-card";
import type { Space, CheckoutRequest } from "@/shared/types/entities";
import QRCode from "react-qr-code";
import Fuse from "fuse.js";

interface SpaceQR {
  uuid: string;
  expiresAt: number;
  spaceName: string;
}

function QrDisplay({ spaceId }: { spaceId: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    async function fetchQr() {
      try {
        const d = await apiFetch<SpaceQR>(`/spaces/${spaceId}/qr`);
        setQr(`${window.location.origin}/checkin?token=${d.uuid}`);
        const msLeft = d.expiresAt - Date.now();
        setSecondsLeft(Math.round(msLeft / 1000));
        timer = setTimeout(fetchQr, Math.max(msLeft, 0));
      } catch {
        /* silent */
      }
    }

    fetchQr();
    return () => clearTimeout(timer);
  }, [spaceId]);

  useEffect(() => {
    if (secondsLeft === null) return;
    const tick = setInterval(
      () => setSecondsLeft((s) => (s !== null ? Math.max(0, s - 1) : null)),
      1000,
    );
    return () => clearInterval(tick);
  }, [secondsLeft]);

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        QR code — customers scan to check in
      </p>
      {qr ? (
        <div className="bg-white p-4 rounded-xl">
          <QRCode value={qr} size={220} level="L" />
        </div>
      ) : (
        <div className="w-[220px] h-[220px] bg-muted rounded-xl animate-pulse" />
      )}
      {secondsLeft !== null && (
        <p className="text-[10px] text-muted-foreground">
          Refreshes in {Math.floor(secondsLeft / 60)}:
          {String(secondsLeft % 60).padStart(2, "0")}
        </p>
      )}
    </div>
  );
}

interface PaginatedRequests {
  data: CheckoutRequest[];
  total: number;
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

export default function OwnerOperatePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [space, setSpace] = useState<Space | null>(null);
  const [requests, setRequests] = useState<CheckoutRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [query, setQuery] = useState("");

  const fuse = useMemo(() => new Fuse(requests, fuseOptions), [requests]);

  const filtered = query.trim()
    ? fuse.search(query).map((r) => r.item)
    : requests;

  useEffect(() => {
    apiFetch<Space>(`/spaces/${spaceId}`)
      .then(setSpace)
      .catch(() => {});
  }, [spaceId]);

  useEffect(() => {
    async function load() {
      setLoadingRequests(true);
      try {
        const res = await apiFetch<PaginatedRequests>(
          `/checkout/requests?status=PENDING&spaceId=${spaceId}&pageSize=50`,
        );
        setRequests(res.data ?? []);
      } catch {
        setRequests([]);
      } finally {
        setLoadingRequests(false);
      }
    }
    load();
    // Poll every 10 seconds
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [spaceId]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/owner">
            <IconArrowLeft size={16} /> Back
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <h1 className="font-heading font-bold text-2xl text-foreground tracking-tight">
          {space?.name ?? "Operate"}
        </h1>
        <Badge
          variant="outline"
          className="text-[10px] flex items-center gap-1"
        >
          <IconRadio size={10} className="text-primary animate-pulse" />
          Live
        </Badge>
      </div>

      {/* QR */}
      <Card>
        <CardContent>
          <QrDisplay spaceId={spaceId} />
        </CardContent>
      </Card>

      {/* Live checkout queue */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Checkout queue{" "}
          {requests.length > 0 &&
            `(${query.trim() ? `${filtered.length} of ${requests.length}` : requests.length})`}
        </p>
        {/* Search */}
        <div className="relative mb-3">
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
        {loadingRequests ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Card className="bg-muted/20 border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No pending checkout requests
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((req) => (
              <CheckoutRequestCard
                key={req.checkoutRequestId}
                req={req}
                onApprove={async () => {
                  await apiFetch(
                    `/checkout/requests/${req.checkoutRequestId}`,
                    {
                      method: "PATCH",
                      body: JSON.stringify({ status: "APPROVED" }),
                    },
                  );
                  setRequests((r) =>
                    r.filter(
                      (x) => x.checkoutRequestId !== req.checkoutRequestId,
                    ),
                  );
                }}
                onReject={async () => {
                  await apiFetch(
                    `/checkout/requests/${req.checkoutRequestId}`,
                    {
                      method: "PATCH",
                      body: JSON.stringify({ status: "REJECTED" }),
                    },
                  );
                  setRequests((r) =>
                    r.filter(
                      (x) => x.checkoutRequestId !== req.checkoutRequestId,
                    ),
                  );
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
