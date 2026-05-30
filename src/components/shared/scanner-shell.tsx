"use client";

import { QrScanner } from "@/components/user/qr-scanner";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";

interface ScannerShellProps {
  /** Called with the decoded QR text. Throw to resume scanning (error case). */
  onScan: (text: string) => Promise<void>;
  /** Called when the back button is pressed. */
  onBack: () => void;
  /** Hint text shown below the scan guide inside the camera. */
  hint?: string;
  /** Suspend the decode loop (e.g. while a confirmation dialog is open). */
  paused?: boolean;
  /** Rendered below the camera area — use for bottom bar content. */
  bottomContent?: React.ReactNode;
  /** Rendered as overlay on top of the camera — use for dialogs/sheets. */
  children?: React.ReactNode;
}

export function ScannerShell({
  onScan,
  onBack,
  hint,
  paused = false,
  bottomContent,
  children,
}: ScannerShellProps) {
  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Camera area */}
      <div className="flex-1 relative min-h-0">
        {/* Back button — sits on top of camera */}
        <div className="absolute top-4 left-4 z-30">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-white/10 hover:text-white"
          >
            <IconArrowLeft size={16} /> Back
          </Button>
        </div>

        {/* Scanner fills the camera area */}
        <div className="absolute inset-0">
          <QrScanner
            onScan={onScan}
            onBack={onBack}
            paused={paused}
            hint={hint}
          />
        </div>

        {/* Overlay slot (dialogs etc.) */}
        {children}
      </div>

      {/* Optional bottom bar */}
      {bottomContent && (
        <div className="bg-background shrink-0">{bottomContent}</div>
      )}
    </div>
  );
}
