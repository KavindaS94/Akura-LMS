import { listStaff } from "@/lib/auth/actions";
import { InviteForm, TransferOwnershipForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export default async function StaffPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { members, invites, ctx } = await listStaff(slug);
  const admins = members.filter((m) => m.role === "admin" && m.status === "active");

  return (
    <section className="space-y-10">
      <div>
        <h2
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Staff & invites
        </h2>
        <p className="mt-2 text-muted">Invite admins, teachers, and students by link.</p>
        <InviteForm slug={slug} />
      </div>

      <div>
        <h3 className="text-lg font-semibold">Members</h3>
        <ul className="mt-3 divide-y divide-ink/10 border border-ink/10">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap justify-between gap-2 px-3 py-2 text-sm">
              <span className="font-mono text-xs">{m.authUserId}</span>
              <span>
                {m.role}
                {m.isOwner ? " · owner" : ""} · {m.status}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Open invites</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {invites.length === 0 ? (
            <li className="text-muted">None</li>
          ) : (
            invites.map((i) => (
              <li key={i.id} className="rounded border border-ink/10 px-3 py-2">
                {i.email} · {i.role} · expires {i.expiresAt.toISOString().slice(0, 10)}
              </li>
            ))
          )}
        </ul>
      </div>

      {ctx.membership.isOwner ? (
        <div id="ownership">
          <h3 className="text-lg font-semibold">Transfer ownership</h3>
          <p className="mt-1 text-sm text-muted">
            A tenant must always have exactly one Owner. Transfer before leaving.
          </p>
          <TransferOwnershipForm slug={slug} admins={admins} />
        </div>
      ) : null}
    </section>
  );
}
