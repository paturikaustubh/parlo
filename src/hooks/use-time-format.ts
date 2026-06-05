"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "parlo:time-format";

export function useTimeFormat() {
  const [use12, setUse12] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored === "24") setUse12(false);
  }, []);

  const toggle = useCallback(() => {
    setUse12((prev) => {
      const next = !prev;
      localStorage.setItem(KEY, next ? "12" : "24");
      return next;
    });
  }, []);

  return { use12, toggle };
}
