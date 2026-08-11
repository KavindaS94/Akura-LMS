import { requireRole } from "@/lib/tenant/context";
import { TEACHER_ROLES, ForbiddenError } from "@/lib/rbac";
import { ForbiddenPage } from "@/components/tenant-shell";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    await requireRole(slug, TEACHER_ROLES);
    return children;
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return <ForbiddenPage message={err.message} />;
    }
    throw err;
  }
}
