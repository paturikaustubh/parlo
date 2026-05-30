"use client";
import { SWRConfig } from "swr";

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 30_000,
        revalidateOnFocus: false,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
