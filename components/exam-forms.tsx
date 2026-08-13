"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createExamAction,
  publishExamAction,
  type ExamFormState,
} from "@/capabilities/exams/lib/actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Alert } from "@/components/ui/feedback";

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
      <Field label="Class">
        <Select name="classId" required defaultValue="">
          <option value="" disabled>
            Select class
          </option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Title">
        <Input name="title" required placeholder="Term 1 Mathematics" />
      </Field>
      <Field label="Exam date">
        <Input name="examDate" type="date" required />
      </Field>
      <Field label="Max marks">
        <Input name="maxMarks" type="number" required min={1} step="0.01" defaultValue={100} />
      </Field>
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creating…" : "Create exam"}
      </Button>
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
      <Button
        type="button"
        disabled={pending}
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
      </Button>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <p className="text-xs text-muted">
        Every student needs a score first. Teachers cannot publish.
      </p>
    </div>
  );
}