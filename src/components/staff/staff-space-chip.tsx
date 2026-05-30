"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { IconMapPin } from "@tabler/icons-react";
import { pageFetcher } from "@/lib/swr-fetcher";

interface StaffMe {
  spaceId: string | null;
}

interface SpaceData {
  name: string;
  spaceId: string;
}

export function StaffSpaceChip() {
  const router = useRouter();

  const { data: staffMe } = useSWR<StaffMe>(["/staff/me"], pageFetcher);
  const { data: space } = useSWR<SpaceData>(
    staffMe?.spaceId ? [`/spaces/${staffMe.spaceId}`] : null,
    pageFetcher,
  );

  if (!staffMe?.spaceId || !space?.name) return null;

  return (
    <button
      type="button"
      onClick={() => router.push("/staff/vehicles")}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/40 bg-primary/8 text-primary text-xs font-medium hover:bg-primary/15 transition-colors max-w-[120px]"
    >
      <IconMapPin size={11} className="shrink-0" />
      <span className="truncate">{space.name}</span>
    </button>
  );
}
