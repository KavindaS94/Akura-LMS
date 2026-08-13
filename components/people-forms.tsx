"use client";

import { useActionState } from "react";
import {
  createStudentAction,
  importStudentsCsvAction,
  createClassAction,
  assignClassTeacherAction,
  createRegistrationLinkAction,
  submitPublicApplicationAction,
  type PeopleFormState,
} from "@/capabilities/students/lib/actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { FormStatus } from "@/components/ui/form-status";

const initial: PeopleFormState = null;

export function CreateStudentForm({
  slug,
  classes,
}: {
  slug: string;
  classes: { id: string; name: string }[];
}) {
  const action = createStudentAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="mt-4 grid max-w-xl gap-3 sm:grid-cols-2">
      <Field label="Full name">
        <Input name="fullName" required placeholder="Full name" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" placeholder="Email" />
      </Field>
      <Field label="Phone">
        <Input name="phone" placeholder="Phone" />
      </Field>
      <Field label="Class">
        <Select name="classId" defaultValue="">
          <option value="">No class yet</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Guardian name">
        <Input name="guardianName" placeholder="Guardian name" />
      </Field>
      <Field label="Guardian email">
        <Input name="guardianEmail" type="email" placeholder="Guardian email" />
      </Field>
      <Field label="Guardian phone">
        <Input name="guardianPhone" placeholder="Guardian phone" />
      </Field>
      <FormStatus state={state} />
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add student"}
        </Button>
      </div>
    </form>
  );
}

export function ImportCsvForm({ slug }: { slug: string }) {
  const action = importStudentsCsvAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      <p className="text-xs text-muted">CSV columns: full_name, email, phone</p>
      <input name="csv" type="file" accept=".csv,text/csv" required />
      <FormStatus state={state} />
      <Button type="submit" disabled={pending} variant="ghost" className="self-start">
        {pending ? "Importing…" : "Import CSV"}
      </Button>
    </form>
  );
}

export function CreateClassForm({ slug }: { slug: string }) {
  const action = createClassAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="mt-4 flex max-w-md flex-col gap-3">
      <Field label="Class name">
        <Input name="name" required placeholder="Grade 10 A" />
      </Field>
      <Field label="Academic year">
        <Input name="academicYear" placeholder="2026" />
      </Field>
      <Field label="Teacher (optional)">
        <Input
          name="teacherAuthUserId"
          placeholder="Teacher auth user id"
          className="font-mono text-xs"
        />
      </Field>
      <FormStatus state={state} />
      <Button type="submit" disabled={pending} variant="secondary" className="self-start">
        {pending ? "Saving…" : "Create class"}
      </Button>
    </form>
  );
}

export function AssignTeacherForm({
  slug,
  classId,
}: {
  slug: string;
  classId: string;
}) {
  const action = assignClassTeacherAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
      <input type="hidden" name="classId" value={classId} />
      <Input
        name="teacherAuthUserId"
        required
        placeholder="Teacher auth user id"
        className="min-w-[16rem] flex-1 font-mono text-xs"
      />
      <Button type="submit" disabled={pending} variant="ghost" size="sm">
        {pending ? "…" : "Assign teacher"}
      </Button>
      <div className="w-full">
        <FormStatus state={state} />
      </div>
    </form>
  );
}

export function CreateRegLinkForm({
  slug,
  classes,
}: {
  slug: string;
  classes: { id: string; name: string }[];
}) {
  const action = createRegistrationLinkAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="mt-4 grid max-w-xl gap-3">
      <Field label="Label">
        <Input name="label" required placeholder="Open registration" defaultValue="Open registration" />
      </Field>
      <Field label="Vanity slug" hint="Optional short address, e.g. stmarys">
        <Input name="joinSlug" placeholder="e.g. stmarys" />
      </Field>
      <Field label="Default class">
        <Select name="classId" defaultValue="">
          <option value="">Any / choose later</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="collectGuardian"
          defaultChecked
          className="h-4 w-4 rounded border-ink/20 accent-[var(--accent)]"
        />
        Collect guardian details
      </label>
      <FormStatus state={state} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creating…" : "Create registration link"}
      </Button>
    </form>
  );
}

export function PublicRegistrationForm({
  token,
  collectGuardian,
  src,
}: {
  token: string;
  collectGuardian: boolean;
  src?: string;
}) {
  const [state, formAction, pending] = useActionState(
    submitPublicApplicationAction,
    initial,
  );

  return (
    <form action={formAction} className="mt-6 flex w-full flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="src" value={src ?? ""} />
      <Field label="Full name">
        <Input name="fullName" required placeholder="Full name" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" required placeholder="Email" />
      </Field>
      <Field label="Phone">
        <Input name="phone" placeholder="Phone" />
      </Field>
      <Field label="Date of birth">
        <Input name="dateOfBirth" type="date" />
      </Field>
      <Field label="Create password">
        <Input
          name="password"
          type="password"
          required
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
      </Field>
      {collectGuardian ? (
        <>
          <Field label="Guardian name">
            <Input name="guardianName" required placeholder="Guardian name" />
          </Field>
          <Field label="Guardian email">
            <Input name="guardianEmail" type="email" placeholder="Guardian email" />
          </Field>
          <Field label="Guardian phone">
            <Input name="guardianPhone" placeholder="Guardian phone" />
          </Field>
        </>
      ) : null}
      <FormStatus state={state} />
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
