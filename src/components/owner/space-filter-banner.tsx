"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { IconMapPin, IconX } from "@tabler/icons-react";

interface SpaceFilterBannerProps {
  spaceName?: string;
}

export function SpaceFilterBanner({ spaceName }: SpaceFilterBannerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const spaceId = searchParams.get("space");

  if (!spaceId) return null;

  function clearFilter() {
    router.push(pathname);
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-xl bg-primary/8 border border-primary/20 text-sm">
      <IconMapPin size={14} className="text-primary shrink-0" />
      <span className="text-foreground font-medium flex-1 truncate">
        Filtered by: <span className="text-primary">{spaceName ?? "…"}</span>
      </span>
      <button
        type="button"
        onClick={clearFilter}
        aria-label="Clear space filter"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <IconX size={14} />
      </button>
    </div>
  );
}
