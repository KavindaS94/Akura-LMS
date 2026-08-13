import { listStaff } from "@/lib/auth/actions";
import { InviteForm, TransferOwnershipForm } from "@/components/auth-forms";
import { Card, EmptyState } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const roleTone: Record<string, "accent" | "neutral"> = {
  admin: "accent",
  teacher: "neutral",
  student: "neutral",
};

const statusTone: Record<string, "success" | "neutral" | "danger" | "warning"> = {
  active: "success",
  pending: "warning",
  deactivated: "danger",
};

export default async function StaffPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { members, invites, ctx } = await listStaff(slug);
  const admins = members.filter((m) => m.role === "admin" && m.status === "active");

  return (
    <section className="space-y-8">
      <PageHeader title="Staff & invites" subtitle="Invite admins, teachers, and students by link." />

      <Card title="Invite a new member" description="They'll receive a secure link to join.">
        <InviteForm slug={slug} />
      </Card>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-ink">
          Members <span className="text-sm font-normal text-muted">({members.length})</span>
        </h3>
        {members.length === 0 ? (
          <EmptyState title="No members" />
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink/10 bg-white px-4 py-3 text-sm shadow-xs"
              >
                <code className="font-mono text-xs text-ink/70">{m.authUserId}</code>
                <div className="flex items-center gap-2">
                  <Badge tone={roleTone[m.role] ?? "neutral"}>{m.role}</Badge>
                  {m.isOwner ? <Badge tone="accent">Owner</Badge> : null}
                  <Badge tone={statusTone[m.status] ?? "neutral"}>{m.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold text-ink">Open invites</h3>
        {invites.length === 0 ? (
          <EmptyState title="No open invites" />
        ) : (
          <ul className="space-y-2">
            {invites.map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink/10 bg-white px-4 py-3 text-sm shadow-xs"
              >
                <span className="text-ink">{i.email}</span>
                <span className="text-muted">
                  {i.role} · expires {i.expiresAt.toISOString().slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {ctx.membership.isOwner ? (
        <Card
          id="ownership"
          title="Transfer ownership"
          description="A tenant must always have exactly one Owner. Transfer before leaving."
        >
          <TransferOwnershipForm slug={slug} admins={admins} />
        </Card>
      ) : null}
    </section>
  );
}
