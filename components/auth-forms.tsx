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
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { FormStatus } from "@/components/ui/form-status";

const initial: FormState = null;

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initial);
  return (
    <form action={formAction} className="mt-6 flex w-full flex-col gap-4">
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" placeholder="you@institute.edu" />
      </Field>
      <Field label="Password">
        <Input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </Field>
      <FormStatus state={state} />
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initial);
  return (
    <form action={formAction} className="mt-6 flex w-full flex-col gap-4">
      <Field label="Your name">
        <Input name="name" required autoComplete="name" placeholder="Priya Fernando" />
      </Field>
      <Field label="Work email">
        <Input name="email" type="email" required autoComplete="email" placeholder="you@institute.edu" />
      </Field>
      <Field label="Password">
        <Input
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </Field>
      <Field label="Institute name">
        <Input name="instituteName" required placeholder="St. Mary's College" />
      </Field>
      <Field label="URL slug" hint="Short address: akura.elgiriya.com/i/…">
        <Input name="slug" required placeholder="st-marys" />
      </Field>
      <FormStatus state={state} />
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Creating…" : "Create institute"}
      </Button>
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
    <form action={formAction} className="mt-6 flex w-full flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Field label="Your name">
        <Input name="name" required autoComplete="name" />
      </Field>
      <Field label="Email">
        <Input
          name="email"
          type="email"
          required
          defaultValue={email}
          autoComplete="email"
        />
      </Field>
      <Field label="Password">
        <Input
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </Field>
      <FormStatus state={state} />
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Joining…" : "Accept invite"}
      </Button>
    </form>
  );
}

export function InviteForm({ slug }: { slug: string }) {
  const action = createInviteAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      <Field label="Email">
        <Input name="email" type="email" required placeholder="teacher@institute.edu" />
      </Field>
      <Field label="Role">
        <Select name="role" defaultValue="teacher">
          <option value="admin">Admin</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </Select>
      </Field>
      <FormStatus state={state} />
      <Button type="submit" disabled={pending} variant="secondary">
        {pending ? "Creating…" : "Create invite link"}
      </Button>
    </form>
  );
}

export function OnboardingForm({ slug }: { slug: string }) {
  const action = completeOnboardingAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="mt-6 flex w-full flex-col gap-4">
      <Field label="Timezone">
        <Select name="timezone" defaultValue="Asia/Colombo">
          <option value="Asia/Colombo">Asia/Colombo</option>
          <option value="Asia/Kolkata">Asia/Kolkata</option>
          <option value="UTC">UTC</option>
        </Select>
      </Field>
      <Field label="Accent colour" hint="Used across your workspace — pick your institute colour.">
        <Input name="accentColor" type="color" defaultValue="#E4761B" className="h-10 w-16 px-1" />
      </Field>
      <FormStatus state={state} />
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Saving…" : "Finish setup"}
      </Button>
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
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      <Field label="New owner (admin)">
        <Select name="membershipId" required>
          {candidates.map((a) => (
            <option key={a.id} value={a.id}>
              {a.authUserId}
            </option>
          ))}
        </Select>
      </Field>
      <FormStatus state={state} />
      <Button type="submit" disabled={pending} variant="danger" className="self-start">

        {pending ? "Transferring…" : "Transfer ownership"}
      </Button>
    </form>
  );
}
