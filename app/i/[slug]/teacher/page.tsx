import Link from "next/link";
import { requireRole } from "@/lib/tenant/context";
import { TEACHER_ROLES } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function TeacherHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireRole(slug, TEACHER_ROLES);

  return (
    <section className="space-y-6">
      <div>
        <h2
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Today
        </h2>
        <p className="mt-2 text-muted">Hello {ctx.user.email}.</p>
      </div>
      <Link
        href={`/i/${slug}/teacher/attendance`}
        className="inline-flex rounded-md bg-accent px-4 py-3 text-sm font-medium text-white"
      >
        Mark attendance
      </Link>
    </section>
  );
}
