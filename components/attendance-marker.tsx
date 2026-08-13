"use client";

import { useEffect, useState, useTransition } from "react";
import { saveMarksAction } from "@/capabilities/attendance/lib/actions";
import type { AttendanceStatus } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";

type RosterItem = {
  student: { id: string; fullName: string };
  effectiveStatus: AttendanceStatus;
  mark: { arrivedAt: Date | string | null; note: string | null } | null;
};

const draftKey = (sessionId: string) => `akura.attendance.draft.${sessionId}`;

const statusBadge: Record<AttendanceStatus, { label: string; tone: "success" | "danger" | "accent" }> = {
  present: { label: "Present", tone: "success" },
  absent: { label: "Absent", tone: "danger" },
  late: { label: "Late", tone: "accent" },
};

export function AttendanceMarker({
  slug,
  sessionId,
  roster,
  isAdmin,
  locked,
}: {
  slug: string;
  sessionId: string;
  roster: RosterItem[];
  isAdmin: boolean;
  locked?: boolean;
}) {
  const [marks, setMarks] = useState<
    Record<string, { status: AttendanceStatus; arrivedAt?: string | null }>
  >(() => {
    const init: Record<string, { status: AttendanceStatus; arrivedAt?: string | null }> =
      {};
    for (const row of roster) {
      init[row.student.id] = {
        status: row.effectiveStatus,
        arrivedAt: row.mark?.arrivedAt
          ? new Date(row.mark.arrivedAt).toISOString()
          : null,
      };
    }
    return init;
  });
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey(sessionId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as typeof marks;
      setMarks((prev) => ({ ...prev, ...parsed }));
    } catch {
      /* ignore */
    }
  }, [sessionId]);

  useEffect(() => {
    localStorage.setItem(draftKey(sessionId), JSON.stringify(marks));
  }, [marks, sessionId]);

  function cycle(studentId: string) {
    setMarks((prev) => {
      const cur = prev[studentId]?.status ?? "present";
      const next: AttendanceStatus =
        cur === "present" ? "absent" : cur === "absent" ? "late" : "present";
      return {
        ...prev,
        [studentId]: {
          status: next,
          arrivedAt:
            next === "late" ? new Date().toISOString() : null,
        },
      };
    });
  }

  function save() {
    setError(null);
    setMessage(null);
    const payload = {
      marks: Object.entries(marks).map(([studentId, v]) => ({
        studentId,
        status: v.status,
        arrivedAt: v.arrivedAt ?? null,
      })),
      editReason: reason || undefined,
    };

    const attempt = async (retries: number): Promise<void> => {
      const res = await saveMarksAction(slug, sessionId, payload);
      if (res?.error) {
        if (retries > 0 && !navigator.onLine) {
          await new Promise((r) => setTimeout(r, 1500));
          return attempt(retries - 1);
        }
        if (retries > 0) {
          await new Promise((r) => setTimeout(r, 800));
          return attempt(retries - 1);
        }
        setError(res.error);
        return;
      }
      localStorage.removeItem(draftKey(sessionId));
      setMessage(res?.ok ?? "Saved");
    };

    start(() => {
      void attempt(3);
    });
  }

  const countBy = Object.values(marks).reduce<Record<string, number>>(
    (acc, m) => {
      acc[m.status] = (acc[m.status] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted">
          Everyone starts <strong className="text-ink">Present</strong>. Tap to cycle Absent →
          Late → Present.
        </p>
        <Badge tone={online ? "success" : "danger"}>
          {online ? "Online" : "Offline — draft kept locally"}
        </Badge>
      </div>

      {locked ? (
        <Alert tone="error" title={isAdmin ? "Session is locked" : "Session is locked"}>
          {isAdmin
            ? "Provide a reason below to save edits."
            : "Only an admin can edit with a reason."}
        </Alert>
      ) : null}

      <ul className="divide-y divide-ink/8 rounded-xl border border-ink/10 bg-white shadow-xs">
        {roster.map((row) => {
          const status = marks[row.student.id]?.status ?? "present";
          return (
            <li key={row.student.id}>
              <button
                type="button"
                onClick={() => cycle(row.student.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-surface/60 active:bg-surface"
              >
                <span className="font-medium text-ink">{row.student.fullName}</span>
                <Badge tone={statusBadge[status].tone}>{statusBadge[status].label}</Badge>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2 text-xs text-muted">
        {(["present", "absent", "late"] as const).map((s) => (
          <span key={s}>
            {statusBadge[s].label}: <strong className="text-ink">{countBy[s] ?? 0}</strong>
          </span>
        ))}
      </div>

      {isAdmin ? (
        <label className="block text-sm">
          <span className="font-medium text-ink">Edit reason</span>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1.5"
            placeholder="Required if the session is locked"
          />
        </label>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      <Button type="button" variant="secondary" disabled={pending} onClick={save} className="w-full py-3">
        {pending ? "Saving…" : "Save attendance"}
      </Button>
    </div>
  );
}