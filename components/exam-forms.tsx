"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createExamAction,
  publishExamAction,
  type ExamFormState,
} from "@/capabilities/exams/lib/actions";

const initial: ExamFormState = null;

export function CreateExamForm({
  slug,
  classes,
}: {
  slug: string;
  classes: { id: string; name: string }[];
}) {
  const action = createExamAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initial);
  const router = useRouter();

  useEffect(() => {
    if (state?.examId) {
      router.push(`/i/${slug}/admin/exams/${state.examId}`);
    }
  }, [state?.examId, slug, router]);

  return (
    <form action={formAction} className="mt-4 grid max-w-lg gap-3">
      <select
        name="classId"
        required
        className="rounded-md border border-ink/15 px-3 py-2"
        defaultValue=""
      >
        <option value="" disabled>
          Select class
        </option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        name="title"
        required
        placeholder="Exam title"
        className="rounded-md border border-ink/15 px-3 py-2"
      />
      <input
        name="examDate"
        type="date"
        required
        className="rounded-md border border-ink/15 px-3 py-2"
      />
      <input
        name="maxMarks"
        type="number"
        required
        min={1}
        step="0.01"
        defaultValue={100}
        placeholder="Max marks"
        className="rounded-md border border-ink/15 px-3 py-2"
      />
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create exam"}
      </button>
    </form>
  );
}

export function PublishExamButton({
  slug,
  examId,
}: {
  slug: string;
  examId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await publishExamAction(slug, examId);
            if (res?.error) setError(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? "Publishing…" : "Publish marks"}
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <p className="text-xs text-muted">
        Every student needs a score first. Teachers cannot publish.
      </p>
    </div>
  );
}
