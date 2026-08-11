import { requireRole } from "@/lib/tenant/context";
import { ADMIN_ROLES, ForbiddenError } from "@/lib/rbac";
import { ForbiddenPage } from "@/components/tenant-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    await requireRole(slug, ADMIN_ROLES);
    return children;
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return <ForbiddenPage message={err.message} />;
    }
    throw err;
  }
}
