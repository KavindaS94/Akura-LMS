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

const initial: PeopleFormState = null;

function Status({ state }: { state: PeopleFormState }) {
  if (!state) return null;
  return (
    <div className="space-y-1 text-sm">
      {state.error ? <p className="text-danger">{state.error}</p> : null}
      {state.ok ? <p className="text-success">{state.ok}</p> : null}
      {state.inviteUrl ? (
        <p className="break-all text-ink">
          Token link: <code>{state.inviteUrl}</code>
        </p>
      ) : null}
      {state.joinUrl ? (
        <p className="break-all text-ink">
          Vanity link: <code>{state.joinUrl}</code>
        </p>
      ) : null}
      {state.csvErrors?.length ? (
        <ul className="list-disc pl-5 text-danger">
          {state.csvErrors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

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
    <form action={formAction} className="mt-4 grid max-w-xl gap-3">
      <input name="fullName" required placeholder="Full name" className="rounded-md border border-ink/15 px-3 py-2" />
      <input name="email" type="email" placeholder="Email" className="rounded-md border border-ink/15 px-3 py-2" />
      <input name="phone" placeholder="Phone" className="rounded-md border border-ink/15 px-3 py-2" />
      <select name="classId" className="rounded-md border border-ink/15 px-3 py-2" defaultValue="">
        <option value="">No class yet</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input name="guardianName" placeholder="Guardian name" className="rounded-md border border-ink/15 px-3 py-2" />
      <input name="guardianEmail" type="email" placeholder="Guardian email" className="rounded-md border border-ink/15 px-3 py-2" />
      <input name="guardianPhone" placeholder="Guardian phone" className="rounded-md border border-ink/15 px-3 py-2" />
      <Status state={state} />
      <button type="submit" disabled={pending} className="rounded-md bg-ink px-4 py-2 text-sm text-surface disabled:opacity-60">
        {pending ? "Saving…" : "Add student"}
      </button>
    </form>
  );
}

export function ImportCsvForm({ slug }: { slug: string }) {
  const action = importStudentsCsvAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="mt-4 space-y-3">
      <p className="text-xs text-muted">CSV columns: full_name, email, phone</p>
      <input name="csv" type="file" accept=".csv,text/csv" required />
      <Status state={state} />
      <button type="submit" disabled={pending} className="rounded-md border border-ink/20 px-4 py-2 text-sm disabled:opacity-60">
        {pending ? "Importing…" : "Import CSV"}
      </button>
    </form>
  );
}

export function CreateClassForm({ slug }: { slug: string }) {
  const action = createClassAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="mt-4 flex max-w-md flex-col gap-3">
      <input name="name" required placeholder="Class name" className="rounded-md border border-ink/15 px-3 py-2" />
      <input name="academicYear" placeholder="Academic year" className="rounded-md border border-ink/15 px-3 py-2" />
      <input
        name="teacherAuthUserId"
        placeholder="Teacher auth user id (optional)"
        className="rounded-md border border-ink/15 px-3 py-2 font-mono text-xs"
      />
      <Status state={state} />
      <button type="submit" disabled={pending} className="rounded-md bg-ink px-4 py-2 text-sm text-surface">
        {pending ? "Saving…" : "Create class"}
      </button>
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
      <input
        name="teacherAuthUserId"
        required
        placeholder="Teacher auth user id"
        className="min-w-[16rem] flex-1 rounded-md border border-ink/15 px-3 py-1.5 font-mono text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-ink/20 px-3 py-1.5 text-xs"
      >
        {pending ? "…" : "Assign teacher"}
      </button>
      <Status state={state} />
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
      <input name="label" required placeholder="Label" defaultValue="Open registration" className="rounded-md border border-ink/15 px-3 py-2" />
      <input name="joinSlug" placeholder="Vanity slug (e.g. stmarys)" className="rounded-md border border-ink/15 px-3 py-2" />
      <select name="classId" className="rounded-md border border-ink/15 px-3 py-2" defaultValue="">
        <option value="">Any / choose later</option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="collectGuardian" defaultChecked />
        Collect guardian details
      </label>
      <Status state={state} />
      <button type="submit" disabled={pending} className="rounded-md bg-accent px-4 py-2 text-sm text-white">
        {pending ? "Creating…" : "Create registration link"}
      </button>
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
    <form action={formAction} className="mt-8 flex w-full max-w-md flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="src" value={src ?? ""} />
      <input name="fullName" required placeholder="Full name" className="rounded-md border border-ink/15 bg-white px-3 py-2" />
      <input name="email" type="email" required placeholder="Email" className="rounded-md border border-ink/15 bg-white px-3 py-2" />
      <input name="phone" placeholder="Phone" className="rounded-md border border-ink/15 bg-white px-3 py-2" />
      <input name="dateOfBirth" type="date" placeholder="DOB" className="rounded-md border border-ink/15 bg-white px-3 py-2" />
      <input name="password" type="password" required placeholder="Create password" className="rounded-md border border-ink/15 bg-white px-3 py-2" />
      {collectGuardian ? (
        <>
          <input name="guardianName" required placeholder="Guardian name" className="rounded-md border border-ink/15 bg-white px-3 py-2" />
          <input name="guardianEmail" type="email" placeholder="Guardian email" className="rounded-md border border-ink/15 bg-white px-3 py-2" />
          <input name="guardianPhone" placeholder="Guardian phone" className="rounded-md border border-ink/15 bg-white px-3 py-2" />
        </>
      ) : null}
      <Status state={state} />
      <button type="submit" disabled={pending} className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white">
        {pending ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
