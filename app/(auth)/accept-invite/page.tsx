import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rowsOf } from "@/lib/db/result";
import { AcceptInviteForm } from "@/components/auth-forms";
import { AuthShell, AuthCardNotice } from "@/components/auth-shell";

export const dynamic = "force-dynamic";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <AuthCardNotice
        title="Missing invite"
        body="This link is incomplete."
        action={{ href: "/", label: "Home" }}
      />
    );
  }

  const result = await db.execute(
    sql`SELECT * FROM app_resolve_invitation_by_token(${token})`,
  );

  const invite = rowsOf<{
    tenant_name: string;
    email: string;
    role: string;
    accepted_at: Date | null;
    expires_at: Date;
    deleted_at: Date | null;
  }>(result)[0];
  if (!invite || invite.deleted_at) {
    return <AuthCardNotice title="Invite not found" />;
  }

  return (
    <AuthShell
      eyebrow="You're invited"
      title={<>Join {invite.tenant_name}</>}
      subtitle={
        <>
          Role: <strong className="font-medium text-ink">{invite.role}</strong>
        </>
      }
    >
      <AcceptInviteForm token={token} email={invite.email} />
    </AuthShell>
  );
}
