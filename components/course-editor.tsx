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
      <select name="classId" required defaultValue="" className="rounded-md border border-ink/15 px-3 py-2">
        <option value="" disabled>
          Select class
        </option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input name="title" required placeholder="Course title" className="rounded-md border border-ink/15 px-3 py-2" />
      <textarea name="description" placeholder="Description" className="rounded-md border border-ink/15 px-3 py-2" rows={3} />
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="rounded-md bg-accent px-4 py-2 text-sm text-white disabled:opacity-60">
        {pending ? "Creating…" : "Create course"}
      </button>
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
    <button
      type="button"
      disabled={pending}
      className="rounded-md bg-ink px-4 py-2 text-sm text-surface disabled:opacity-60"
      onClick={() =>
        start(async () => {
          await publishCourseAction(slug, courseId, next);
          router.refresh();
        })
      }
    >
      {pending ? "…" : next === "published" ? "Publish course" : "Unpublish"}
    </button>
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
      <input name="title" required placeholder="Module title" className="rounded-md border border-ink/15 px-3 py-2" />
      <input name="availableAt" type="datetime-local" className="rounded-md border border-ink/15 px-3 py-2" />
      <button type="submit" disabled={pending} className="rounded-md border border-ink/20 px-3 py-2 text-sm">
        {pending ? "…" : "Add module"}
      </button>
      {state?.error ? <p className="w-full text-sm text-danger">{state.error}</p> : null}
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
      <label className="flex items-center gap-2">
        <input type="checkbox" name="dripEnabled" defaultChecked={dripEnabled} />
        Drip release
      </label>
      <input
        name="availableAt"
        type="datetime-local"
        defaultValue={local}
        className="rounded-md border border-ink/15 px-2 py-1"
      />
      <button type="submit" disabled={pending} className="rounded-md border border-ink/20 px-2 py-1 text-xs">
        Save drip
      </button>
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
    <form action={formAction} className="mt-3 grid gap-2 border-t border-ink/10 pt-3">
      <input type="hidden" name="type" value={type} />
      <div className="flex gap-2 text-sm">
        <button type="button" className={type === "text" ? "text-accent" : "text-muted"} onClick={() => setType("text")}>
          Text
        </button>
        <button type="button" className={type === "link" ? "text-accent" : "text-muted"} onClick={() => setType("link")}>
          Link
        </button>
      </div>
      <input name="title" required placeholder="Resource title" className="rounded-md border border-ink/15 px-3 py-2 text-sm" />
      {type === "text" ? (
        <textarea name="body" rows={3} placeholder="Content" className="rounded-md border border-ink/15 px-3 py-2 text-sm" />
      ) : (
        <input name="externalUrl" type="url" placeholder="https://" className="rounded-md border border-ink/15 px-3 py-2 text-sm" />
      )}
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="justify-self-start rounded-md border border-ink/20 px-3 py-1.5 text-sm">
        {pending ? "…" : "Add resource"}
      </button>
    </form>
  );
}
