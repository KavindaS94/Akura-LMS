"use client";

import { useEffect, useState, useTransition } from "react";
import { saveMarksAction } from "@/capabilities/attendance/lib/actions";
import type { AttendanceStatus } from "@/lib/db/schema";

type RosterItem = {
  student: { id: string; fullName: string };
  effectiveStatus: AttendanceStatus;
  mark: { arrivedAt: Date | string | null; note: string | null } | null;
};

const draftKey = (sessionId: string) => `akura.attendance.draft.${sessionId}`;

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted">
          Everyone starts <strong>Present</strong>. Tap to cycle Absent → Late → Present.
        </p>
        <p className={online ? "text-success" : "text-danger"}>
          {online ? "Online" : "Offline — draft kept locally"}
        </p>
      </div>

      {locked ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {isAdmin
            ? "Session is locked. Provide a reason below to save edits."
            : "Session is locked. Only an admin can edit with a reason."}
        </p>
      ) : null}

      <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
        {roster.map((row) => {
          const status = marks[row.student.id]?.status ?? "present";
          const color =
            status === "present"
              ? "bg-success/15 text-success"
              : status === "absent"
                ? "bg-danger/15 text-danger"
                : "bg-accent/15 text-accent";
          return (
            <li key={row.student.id}>
              <button
                type="button"
                onClick={() => cycle(row.student.id)}
                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm active:bg-surface"
              >
                <span className="font-medium">{row.student.fullName}</span>
                <span className={`rounded px-2 py-1 text-xs font-semibold uppercase ${color}`}>
                  {status}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {isAdmin ? (
        <label className="block text-sm">
          <span className="text-muted">Edit reason (required if session locked)</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-md border border-ink/15 px-3 py-2"
            placeholder="Correction reason"
          />
        </label>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}

      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="w-full rounded-md bg-ink px-4 py-3 text-sm font-medium text-surface disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save attendance"}
      </button>
    </div>
  );
}
