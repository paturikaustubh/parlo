"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/components/ui/toast";
import { IconFlag } from "@tabler/icons-react";
import { apiFetch } from "@/lib/api-client";
import { useStaff } from "@/contexts/staff-context";
import { cn } from "@/lib/utils";

type Tab = "notes" | "flags";

interface StaffNote {
  staffNoteId: string;
  body: string;
  createdAt: string;
}
interface StaffFlag {
  staffFlagId: string;
  type: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

const FLAG_TYPES = [
  { value: "SPACE_ISSUE", label: "Space issue" },
  { value: "VEHICLE_ISSUE", label: "Vehicle issue" },
  { value: "OTHER", label: "Other" },
];

const FLAG_COLORS: Record<string, string> = {
  SPACE_ISSUE: "text-amber-600 border-amber-600/30",
  VEHICLE_ISSUE: "text-blue-600 border-blue-600/30",
  OTHER: "text-muted-foreground",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function StaffProfilePage() {
  const { staffMember } = useStaff();
  const [tab, setTab] = useState<Tab>("notes");
  const [notes, setNotes] = useState<StaffNote[]>([]);
  const [flags, setFlags] = useState<StaffFlag[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [showFlagSheet, setShowFlagSheet] = useState(false);
  const [flagType, setFlagType] = useState("SPACE_ISSUE");
  const [flagDesc, setFlagDesc] = useState("");
  const [raisingFlag, setRaisingFlag] = useState(false);

  const fetchNotes = useCallback(
    () =>
      apiFetch<StaffNote[]>("/staff/me/notes")
        .then(setNotes)
        .catch(() => {}),
    [],
  );
  const fetchFlags = useCallback(
    () =>
      apiFetch<StaffFlag[]>("/staff/me/flags")
        .then(setFlags)
        .catch(() => {}),
    [],
  );

  useEffect(() => {
    fetchNotes();
    fetchFlags();
  }, [fetchNotes, fetchFlags]);

  async function handleAddNote() {
    if (!noteBody.trim()) return;
    setAddingNote(true);
    try {
      await apiFetch("/staff/me/notes", {
        method: "POST",
        body: JSON.stringify({ body: noteBody.trim() }),
      });
      setNoteBody("");
      fetchNotes();
    } catch {
      showToast("Failed to add note.", "error");
    } finally {
      setAddingNote(false);
    }
  }

  async function handleRaiseFlag() {
    if (!flagDesc.trim()) return;
    setRaisingFlag(true);
    try {
      await apiFetch("/staff/me/flags", {
        method: "POST",
        body: JSON.stringify({ type: flagType, description: flagDesc.trim() }),
      });
      showToast("Flag raised.", "success");
      setShowFlagSheet(false);
      setFlagDesc("");
      setFlagType("SPACE_ISSUE");
      fetchFlags();
    } catch {
      showToast("Failed to raise flag.", "error");
    } finally {
      setRaisingFlag(false);
    }
  }

  const initials =
    staffMember?.user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "S";

  return (
    <div className="space-y-5">
      {/* Profile header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-heading font-bold text-base shrink-0">
          {initials}
        </div>
        <div>
          <p className="font-heading font-bold text-lg text-foreground">
            {staffMember?.user.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {staffMember?.user.phone} · Staff
          </p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex bg-muted rounded-xl p-1 gap-1">
        {(["notes", "flags"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors",
              tab === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "notes" && (
        <div className="space-y-3">
          {notes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No notes yet
            </p>
          )}
          {notes.map((note) => (
            <Card key={note.staffNoteId}>
              <CardContent className="px-4 py-3">
                <p className="text-[10px] text-muted-foreground mb-1">
                  {formatDate(note.createdAt)}
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {note.body}
                </p>
              </CardContent>
            </Card>
          ))}
          <div className="space-y-2 pt-1">
            <Textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Add a shift note…"
              rows={3}
              className="text-sm resize-none"
            />
            <Button
              className="w-full"
              disabled={!noteBody.trim() || addingNote}
              onClick={handleAddNote}
            >
              {addingNote ? "Saving…" : "Add note"}
            </Button>
          </div>
        </div>
      )}

      {tab === "flags" && (
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setShowFlagSheet(true)}
          >
            <IconFlag size={15} /> Raise a flag
          </Button>
          {flags.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No flags raised
            </p>
          )}
          {flags.map((flag) => (
            <Card key={flag.staffFlagId}>
              <CardContent className="px-4 py-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px]", FLAG_COLORS[flag.type] ?? "")}
                  >
                    {FLAG_TYPES.find((f) => f.value === flag.type)?.label ??
                      flag.type}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      flag.status === "RESOLVED"
                        ? "text-emerald-600 border-emerald-600/30 text-[10px]"
                        : "text-amber-600 border-amber-600/30 text-[10px]"
                    }
                  >
                    {flag.status}
                  </Badge>
                </div>
                <p className="text-sm text-foreground">{flag.description}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDate(flag.createdAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Raise flag sheet */}
      <Sheet
        open={showFlagSheet}
        onOpenChange={(o) => {
          setShowFlagSheet(o);
          if (!o) {
            setFlagDesc("");
            setFlagType("SPACE_ISSUE");
          }
        }}
      >
        <SheetContent side="bottom" className="rounded-t-3xl p-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/60">
            <SheetTitle>Raise a flag</SheetTitle>
          </SheetHeader>
          <div className="px-5 py-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Type
              </label>
              <Select value={flagType} onValueChange={setFlagType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLAG_TYPES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Description *
              </label>
              <Textarea
                value={flagDesc}
                onChange={(e) => setFlagDesc(e.target.value)}
                placeholder="Describe the issue…"
                rows={3}
                className="text-sm resize-none"
              />
            </div>
            <Button
              className="w-full h-12"
              disabled={!flagDesc.trim() || raisingFlag}
              onClick={handleRaiseFlag}
            >
              {raisingFlag ? "Raising…" : "Raise flag"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
