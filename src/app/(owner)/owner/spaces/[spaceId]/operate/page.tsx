"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconRadio } from "@tabler/icons-react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { SpaceOperationsPanel } from "@/components/shared/space-operations-panel";
import type { Space } from "@/shared/types/entities";

export default function OwnerOperatePage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [space, setSpace] = useState<Space | null>(null);

  useEffect(() => {
    apiFetch<Space>(`/spaces/${spaceId}`)
      .then(setSpace)
      .catch(() => {});
  }, [spaceId]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={`/owner/spaces/${spaceId}`}>
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

      {/* Space operations panel (QR + checkout requests) */}
      <SpaceOperationsPanel spaceId={spaceId} spaceName={space?.name} />
    </div>
  );
}
