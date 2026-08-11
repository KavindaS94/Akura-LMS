import { requireRole } from "@/lib/tenant/context";
import { STUDENT_ROLES } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function StudentHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireRole(slug, STUDENT_ROLES);

  return (
    <section>
      <h2
        className="text-2xl font-semibold"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Student
      </h2>
      <p className="mt-2 text-muted">
        Hello {ctx.user.email}. Open Results for published marks.
      </p>
    </section>
  );
}
