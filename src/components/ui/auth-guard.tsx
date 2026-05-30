"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Wraps auth pages (signin, signup). Redirects to /dashboard if
 * a valid auth token is already present in localStorage.
 * Returns null until the check completes to prevent content flash.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      router.replace("/dashboard");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;

  return <>{children}</>;
}
