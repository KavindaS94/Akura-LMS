"use client";

import { useMemo, useState, useTransition } from "react";
import { saveMarksAction } from "@/capabilities/exams/lib/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";

type Row = {
  studentId: string;
  fullName: string;
  score: number | null;
};

export function MarksEntryGrid({
  slug,
  examId,
  maxMarks,
  published,
  initial,
}: {
  slug: string;
  examId: string;
  maxMarks: number;
  published: boolean;
  initial: Row[];
}) {
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const r of initial) {
      init[r.studentId] = r.score === null ? "" : String(r.score);
    }
    return init;
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filled = useMemo(
    () => Object.values(scores).filter((v) => v.trim() !== "").length,
    [scores],
  );

  function save() {
    setError(null);
    setMessage(null);
    const payload = {
      scores: initial.map((r) => {
        const raw = scores[r.studentId]?.trim() ?? "";
        return {
          studentId: r.studentId,
          score: raw === "" ? null : Number(raw),
        };
      }),
    };
    for (const s of payload.scores) {
      if (s.score !== null && (Number.isNaN(s.score) || s.score < 0 || s.score > maxMarks)) {
        setError(`Scores must be numbers from 0 to ${maxMarks}.`);
        return;
      }
    }
    start(async () => {
      const res = await saveMarksAction(slug, examId, payload);
      if (res?.error) setError(res.error);
      else setMessage(res?.ok ?? "Saved");
    });
  }

  const pct = initial.length > 0 ? Math.round((filled / initial.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted">
          Max <strong className="text-ink">{maxMarks}</strong> ·{" "}
          {filled}/{initial.length} entered
          {published ? " · Published (read-only)" : ""}
        </p>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-ink/8">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-ink/10 bg-white shadow-xs">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-ink/10 bg-surface/60 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2.5">Student</th>
              <th className="w-32 px-4 py-2.5">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/8">
            {initial.map((r) => (
              <tr key={r.studentId} className="transition-colors hover:bg-surface/40">
                <td className="px-4 py-2.5 font-medium text-ink">{r.fullName}</td>
                <td className="px-4 py-2.5">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={maxMarks}
                    step="0.01"
                    disabled={published || pending}
                    value={scores[r.studentId] ?? ""}
                    onChange={(e) =>
                      setScores((prev) => ({
                        ...prev,
                        [r.studentId]: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:bg-surface disabled:text-muted"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      {!published ? (
        <Button type="button" variant="secondary" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save marks"}
        </Button>
      ) : null}
    </div>
  );
}