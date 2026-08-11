import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { AcceptInviteForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">Missing invite</h1>
        <p className="mt-2 text-muted">This link is incomplete.</p>
        <Link href="/" className="mt-6 inline-block text-accent">
          Home
        </Link>
      </main>
    );
  }

  const result = await db.execute<{
    tenant_name: string;
    email: string;
    role: string;
    accepted_at: Date | null;
    expires_at: Date;
    deleted_at: Date | null;
  }>(sql`SELECT * FROM app_resolve_invitation_by_token(${token})`);

  const invite = result.rows[0];
  if (!invite || invite.deleted_at) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">Invite not found</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="text-sm text-muted">
        ← Akura
      </Link>
      <h1
        className="mt-6 text-3xl font-semibold text-ink"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Join {invite.tenant_name}
      </h1>
      <p className="mt-2 text-muted">
        Role: <strong>{invite.role}</strong>
      </p>
      <AcceptInviteForm token={token} email={invite.email} />
    </main>
  );
}
