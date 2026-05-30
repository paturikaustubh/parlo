"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft, IconKey } from "@tabler/icons-react";
import { showToast } from "@/components/ui/toast";
import { AuthGuard } from "@/components/ui/auth-guard";

const inputStyle = {
  background: "oklch(0.19 0.005 49)",
  border: "1px solid oklch(0.28 0.005 49)",
  color: "oklch(0.92 0.005 60)",
  borderRadius: "0.625rem",
};

function SignInInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/tokens/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+91${phone}`, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "INVALID_CREDENTIALS")
          throw new Error("Incorrect phone number or password.");
        throw new Error(data.error ?? "Sign in failed. Please try again.");
      }
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user_name", data.user.name);
      showToast(`Welcome back, ${data.user.name}!`, "success");

      // Fetch roles to redirect to the right dashboard
      try {
        const meRes = await fetch("/api/v1/users/me", {
          headers: { Authorization: `Bearer ${data.token}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          const roles: { role: string; isActive: boolean }[] =
            me?.data?.roles ?? [];
          const hasVerifier = roles.some(
            (r) => r.role === "VERIFIER" && r.isActive,
          );
          if (hasVerifier) {
            router.push(next ?? "/verifier");
            return;
          }
        }
      } catch {
        /* fall through to default */
      }

      router.push(next ?? "/dashboard");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Sign in failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8 group">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-transform group-hover:scale-105"
          style={{
            background: "oklch(0.852 0.199 91.936)",
            color: "oklch(0.147 0.004 49.25)",
          }}
        >
          P
        </div>
        <span
          className="font-bold text-lg tracking-tight"
          style={{
            color: "oklch(0.92 0.005 60)",
            fontFamily: "var(--font-heading)",
          }}
        >
          parlo
        </span>
      </Link>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-7"
        style={{
          background: "oklch(0.19 0.004 49.25)",
          border: "1px solid oklch(0.26 0.005 49)",
        }}
      >
        {/* Back */}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs mb-6 transition-opacity hover:opacity-70"
          style={{ color: "oklch(0.6 0.015 60)" }}
        >
          <IconArrowLeft size={13} />
          Home
        </Link>

        <h1
          className="font-bold text-2xl mb-1 leading-tight"
          style={{
            color: "oklch(0.95 0.005 60)",
            fontFamily: "var(--font-heading)",
          }}
        >
          Welcome back
        </h1>
        <p className="text-sm mb-7" style={{ color: "oklch(0.55 0.015 60)" }}>
          Sign in to your Parlo account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "oklch(0.65 0.015 60)" }}
            >
              Phone number
            </label>
            <div className="flex">
              <span
                className="flex items-center px-3 rounded-l-xl text-sm font-medium"
                style={{
                  background: "oklch(0.22 0.005 49)",
                  border: "1px solid oklch(0.28 0.005 49)",
                  borderRight: "none",
                  color: "oklch(0.65 0.015 60)",
                }}
              >
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                className="flex-1 rounded-r-xl px-3 py-2.5 text-sm outline-none focus:ring-1"
                style={{ ...inputStyle, borderRadius: "0 0.625rem 0.625rem 0" }}
                autoFocus
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "oklch(0.65 0.015 60)" }}
            >
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1"
              style={inputStyle}
              required
            />
          </div>

          {error && (
            <p className="text-xs" style={{ color: "oklch(0.65 0.2 25)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={phone.length < 10 || !password || loading}
            className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 mt-1"
            style={{
              background: "oklch(0.852 0.199 91.936)",
              color: "oklch(0.147 0.004 49.25)",
            }}
          >
            <IconKey size={16} />
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-xs" style={{ color: "oklch(0.5 0.015 60)" }}>
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium transition-opacity hover:opacity-70"
          style={{ color: "oklch(0.852 0.199 91.936)" }}
        >
          Sign up
        </Link>
      </p>
    </AuthGuard>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInInner />
    </Suspense>
  );
}
