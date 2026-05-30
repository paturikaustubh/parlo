"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function usePaginationParams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function get(key: string, fallback = ""): string {
    return searchParams.get(key) ?? fallback;
  }

  function getInt(key: string, fallback: number): number {
    const v = searchParams.get(key);
    const n = v ? parseInt(v, 10) : NaN;
    return isNaN(n) ? fallback : n;
  }

  function setParam(key: string, value: string | number | null) {
    const p = new URLSearchParams(searchParams.toString());
    // Only delete on null or empty — 'all' is a valid tab/filter value in the URL
    if (value === null || value === "") {
      p.delete(key);
    } else {
      p.set(key, String(value));
    }
    if (key !== "page") p.set("page", "1");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  function setParams(updates: Record<string, string | number | null>) {
    const p = new URLSearchParams(searchParams.toString());
    let resetPage = false;
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        p.delete(key);
      } else {
        p.set(key, String(value));
      }
      if (key !== "page") resetPage = true;
    }
    if (resetPage && !("page" in updates)) p.set("page", "1");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  return { get, getInt, setParam, setParams };
}
