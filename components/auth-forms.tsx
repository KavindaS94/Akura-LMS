"use client";

import { useActionState } from "react";
import {
  loginAction,
  signupAction,
  acceptInviteAction,
  createInviteAction,
  completeOnboardingAction,
  transferOwnershipAction,
  type FormState,
} from "@/lib/auth/actions";

const initial: FormState = null;

function Field(props: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted">{props.label}</span>
      <input
        name={props.name}
        type={props.type ?? "text"}
        required={props.required}
        defaultValue={props.defaultValue}
        autoComplete={props.autoComplete}
        className="rounded-md border border-ink/15 bg-white px-3 py-2 text-ink outline-none focus:border-accent"
      />
    </label>
  );
}

function Status({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error) {
    return (
      <p className="text-sm text-danger" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <div className="space-y-1 text-sm text-success">
        <p>{state.ok}</p>
        {state.inviteUrl ? (
          <p className="break-all text-ink">
            Link: <code>{state.inviteUrl}</code>
          </p>
        ) : null}
      </div>
    );
  }
  return null;
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  return (
    <form action={formAction} className="mt-8 flex w-full max-w-sm flex-col gap-4">
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      <Field
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
      />
      <Status state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initial);
  return (
    <form action={formAction} className="mt-8 flex w-full max-w-md flex-col gap-4">
      <Field label="Your name" name="name" required autoComplete="name" />
      <Field label="Work email" name="email" type="email" required autoComplete="email" />
      <Field
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="new-password"
      />
      <Field label="Institute name" name="instituteName" required />
      <Field label="URL slug (e.g. st-marys)" name="slug" required />
      <Status state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create institute"}
      </button>
    </form>
  );
}

export function AcceptInviteForm({
  token,
  email,
}: {
  token: string;
  email?: string;
}) {
  const [state, formAction, pending] = useActionState(acceptInviteAction, initial);
  return (
    <form action={formAction} className="mt-8 flex w-full max-w-md flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Field label="Your name" name="name" required autoComplete="name" />
      <Field
        label="Email"
        name="email"
        type="email"
        required
        defaultValue={email}
        autoComplete="email"
      />
      <Field
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="new-password"
      />
      <Status state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Joining…" : "Accept invite"}
      </button>
    </form>
  );
}

export function InviteForm({ slug }: { slug: string }) {
  const action = createInviteAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="mt-4 flex max-w-lg flex-col gap-3">
      <Field label="Email" name="email" type="email" required />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Role</span>
        <select
          name="role"
          className="rounded-md border border-ink/15 bg-white px-3 py-2"
          defaultValue="teacher"
        >
          <option value="admin">Admin</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>
      </label>
      <Status state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create invite link"}
      </button>
    </form>
  );
}

export function OnboardingForm({ slug }: { slug: string }) {
  const action = completeOnboardingAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="mt-8 flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Timezone</span>
        <select
          name="timezone"
          defaultValue="Asia/Colombo"
          className="rounded-md border border-ink/15 bg-white px-3 py-2"
        >
          <option value="Asia/Colombo">Asia/Colombo</option>
          <option value="Asia/Kolkata">Asia/Kolkata</option>
          <option value="UTC">UTC</option>
        </select>
      </label>
      <Field label="Accent colour (#E4761B)" name="accentColor" defaultValue="#E4761B" />
      <Status state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Finish setup"}
      </button>
    </form>
  );
}

export function TransferOwnershipForm({
  slug,
  admins,
}: {
  slug: string;
  admins: { id: string; authUserId: string; isOwner: boolean }[];
}) {
  const action = transferOwnershipAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initial);
  const candidates = admins.filter((a) => !a.isOwner);
  if (candidates.length === 0) {
    return (
      <p className="mt-2 text-sm text-muted">
        Invite another admin before transferring ownership.
      </p>
    );
  }
  return (
    <form action={formAction} className="mt-4 flex max-w-lg flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">New owner (admin)</span>
        <select
          name="membershipId"
          className="rounded-md border border-ink/15 bg-white px-3 py-2"
          required
        >
          {candidates.map((a) => (
            <option key={a.id} value={a.id}>
              {a.authUserId}
            </option>
          ))}
        </select>
      </label>
      <Status state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-danger px-4 py-2 text-sm font-medium text-danger disabled:opacity-60"
      >
        {pending ? "Transferring…" : "Transfer ownership"}
      </button>
    </form>
  );
}
