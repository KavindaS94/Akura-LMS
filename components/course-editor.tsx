"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addModuleAction,
  addTextOrLinkResourceAction,
  createCourseAction,
  publishCourseAction,
  updateModuleDripAction,
  type CourseFormState,
} from "@/capabilities/courses/lib/actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { Alert } from "@/components/ui/feedback";

const initial: CourseFormState = null;

export function CreateCourseForm({
  slug,
  classes,
  editorBase,
}: {
  slug: string;
  classes: { id: string; name: string }[];
  editorBase: string;
}) {
  const action = createCourseAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initial);
  const router = useRouter();

  useEffect(() => {
    if (state?.id) router.push(`${editorBase}/${state.id}`);
  }, [state?.id, editorBase, router]);

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
        <Input name="title" required placeholder="Grade 10 Mathematics" />
      </Field>
      <Field label="Description">
        <Textarea name="description" placeholder="What students will learn" rows={3} />
      </Field>
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creating…" : "Create course"}
      </Button>
    </form>
  );
}

export function PublishCourseButton({
  slug,
  courseId,
  status,
}: {
  slug: string;
  courseId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = status === "published" ? "draft" : "published";

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await publishCourseAction(slug, courseId, next);
          router.refresh();
        })
      }
    >
      {pending ? "…" : next === "published" ? "Publish course" : "Unpublish"}
    </Button>
  );
}

export function AddModuleForm({ slug, courseId }: { slug: string; courseId: string }) {
  const action = addModuleAction.bind(null, slug, courseId);
  const [state, formAction, pending] = useActionState(action, initial);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="mt-4 flex flex-wrap items-end gap-2">
      <Input name="title" required placeholder="Module title" className="w-56" />
      <Input name="availableAt" type="datetime-local" className="w-52" />
      <Button type="submit" disabled={pending} variant="ghost" size="sm">
        {pending ? "…" : "Add module"}
      </Button>
      {state?.error ? (
        <p className="w-full text-sm">
          <Alert tone="error">{state.error}</Alert>
        </p>
      ) : null}
    </form>
  );
}

export function ModuleDripForm({
  slug,
  moduleId,
  dripEnabled,
  availableAt,
}: {
  slug: string;
  moduleId: string;
  dripEnabled: boolean;
  availableAt: Date | null;
}) {
  const action = updateModuleDripAction.bind(null, slug, moduleId);
  const [state, formAction, pending] = useActionState(action, initial);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  const local = availableAt
    ? new Date(availableAt.getTime() - availableAt.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-center gap-3 text-sm">
      <label className="flex items-center gap-2 text-ink">
        <input
          type="checkbox"
          name="dripEnabled"
          defaultChecked={dripEnabled}
          className="h-4 w-4 rounded border-ink/20 accent-[var(--accent)]"
        />
        Drip release
      </label>
      <Input
        name="availableAt"
        type="datetime-local"
        defaultValue={local}
        className="w-52 py-1 text-xs"
      />
      <Button type="submit" disabled={pending} variant="ghost" size="sm">
        Save drip
      </Button>
    </form>
  );
}

export function AddResourceForm({ slug, moduleId }: { slug: string; moduleId: string }) {
  const action = addTextOrLinkResourceAction.bind(null, slug, moduleId);
  const [state, formAction, pending] = useActionState(action, initial);
  const [type, setType] = useState<"text" | "link">("text");
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="mt-3 grid max-w-lg gap-2 border-t border-ink/10 pt-3">
      <input type="hidden" name="type" value={type} />
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            type === "text" ? "bg-accent/12 text-accent" : "text-muted hover:text-ink"
          }`}
          onClick={() => setType("text")}
        >
          Text
        </button>
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            type === "link" ? "bg-accent/12 text-accent" : "text-muted hover:text-ink"
          }`}
          onClick={() => setType("link")}
        >
          Link
        </button>
      </div>
      <Input name="title" required placeholder="Resource title" />
      {type === "text" ? (
        <Textarea name="body" rows={3} placeholder="Content" />
      ) : (
        <Input name="externalUrl" type="url" placeholder="https://" />
      )}
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      <Button type="submit" disabled={pending} variant="ghost" size="sm" className="justify-self-start">
        {pending ? "…" : "Add resource"}
      </Button>
    </form>
  );
}