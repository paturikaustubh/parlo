"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { showToast } from "@/components/ui/toast";
import { ScannerShell } from "@/components/shared/scanner-shell";
import { apiFetch } from "@/lib/api-client";
import type { ActionSession } from "@/shared/types/entities";

interface SpaceInfo {
  spaceName: string;
  businessName: string;
  actionSessionId: string;
  supportedVehicleTypes: string[];
}

export default function ScanPage() {
  const router = useRouter();
  const [spaceInfo, setSpaceInfo] = useState<SpaceInfo | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleScan = useCallback(async (decodedText: string) => {
    console.log("[QR] raw:", decodedText);
    // Only process parka check-in URLs — ignore unrelated QR codes
    let token: string | null = null;
    try {
      const url = new URL(decodedText);
      console.log(
        "[QR] pathname:",
        url.pathname,
        "token:",
        url.searchParams.get("token"),
      );
      if (url.pathname === "/checkin") {
        token = url.searchParams.get("token");
      }
    } catch {
      console.log("[QR] not a valid URL, ignoring");
      return;
    }

    if (!token) {
      console.log("[QR] no token found, ignoring");
      return;
    }

    console.log("[QR] calling /action-sessions with token:", token);
    try {
      const data = await apiFetch<ActionSession>("/action-sessions", {
        method: "POST",
        body: JSON.stringify({ uuid: token }),
        auth: false,
      });
      console.log("[QR] action session created:", data);
      setSpaceInfo({
        spaceName: data.spaceName,
        businessName: data.businessName,
        actionSessionId: data.id,
        supportedVehicleTypes: data.supportedVehicleTypes ?? [],
      });
      setConfirming(true);
    } catch (err) {
      console.log("[QR] error:", err);
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("expired")) {
        showToast("This QR has expired. Ask staff to refresh.", "error");
      } else {
        showToast("Invalid QR code. Please scan the staff's device.", "error");
      }
      throw err; // clears pausedRef in QrScanner so user can retry
    }
  }, []);

  function handleConfirm() {
    if (!spaceInfo) return;
    localStorage.setItem(
      "pending_checkin",
      JSON.stringify({
        actionSessionId: spaceInfo.actionSessionId,
        spaceName: spaceInfo.spaceName,
        businessName: spaceInfo.businessName,
        supportedVehicleTypes: spaceInfo.supportedVehicleTypes,
        expiresAt: Date.now() + 5 * 60 * 1000,
      }),
    );
    router.push("/checkin");
  }

  return (
    <ScannerShell
      onScan={handleScan}
      onBack={() => router.push("/dashboard")}
      paused={confirming}
      hint="Point at the QR code on staff's device"
    >
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Check-in</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;re checking into{" "}
              <strong className="text-foreground">
                {spaceInfo?.spaceName}
              </strong>{" "}
              by {spaceInfo?.businessName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirming(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Confirm Check-in
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScannerShell>
  );
}
