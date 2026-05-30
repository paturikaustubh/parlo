"use client";

import * as React from "react";
import { IconPhone, IconUser } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ContactChipProps {
  name: string | null | undefined;
  phone?: string | null;
  label?: string;
}

export function ContactChip({ name, phone, label }: ContactChipProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!name) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 cursor-pointer group"
      >
        <span className="text-xs font-medium text-foreground border-b border-dashed border-muted-foreground/50 group-hover:border-foreground transition-colors leading-tight">
          {name}
        </span>
        {phone && (
          <IconPhone
            size={10}
            className="text-muted-foreground/60 group-hover:text-muted-foreground transition-colors flex-shrink-0"
          />
        )}
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <IconUser size={16} className="text-muted-foreground" />
              <DialogTitle className="text-sm font-semibold text-foreground">
                {name}
              </DialogTitle>
            </div>
            {label && (
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mt-0.5">
                {label}
              </p>
            )}
          </DialogHeader>

          <div className="space-y-3 pt-1">
            {phone ? (
              <>
                <p className="font-mono text-sm text-foreground">{phone}</p>
                <Button asChild className="w-full gap-2">
                  <a href={`tel:${phone}`}>
                    <IconPhone size={14} />
                    Call {phone}
                  </a>
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No phone number on record.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
