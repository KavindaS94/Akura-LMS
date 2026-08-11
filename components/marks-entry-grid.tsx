"use client";

import { useMemo, useState, useTransition } from "react";
import { saveMarksAction } from "@/capabilities/exams/lib/actions";

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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Max {maxMarks} · {filled}/{initial.length} entered
        {published ? " · Published (read-only)" : ""}
      </p>
      <div className="overflow-x-auto border border-ink/10 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-ink/10 bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2">Student</th>
              <th className="px-3 py-2 w-32">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {initial.map((r) => (
              <tr key={r.studentId}>
                <td className="px-3 py-2 font-medium">{r.fullName}</td>
                <td className="px-3 py-2">
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
                    className="w-full rounded-md border border-ink/15 px-2 py-1.5 disabled:bg-surface"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}
      {!published ? (
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save marks"}
        </button>
      ) : null}
    </div>
  );
}
