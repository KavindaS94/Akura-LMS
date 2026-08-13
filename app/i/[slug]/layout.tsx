import { getTenantContext } from "@/lib/tenant/context";
import { ForbiddenError } from "@/lib/rbac";
import { TenantShell, ForbiddenPage } from "@/components/tenant-shell";
import { TenantError } from "@/lib/tenant/resolve";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const ctx = await getTenantContext(slug);
    return (
      <div
        style={{
          ["--accent" as string]: ctx.tenant.accentColor ?? "#E4761B",
        }}
      >
        <TenantShell
          slug={ctx.slug}
          tenantName={ctx.tenant.name}
          role={ctx.membership.role}
          isOwner={ctx.membership.isOwner}
          userEmail={ctx.user.email}
        >
          {children}
        </TenantShell>
      </div>
    );
  } catch (err) {
    if (err instanceof TenantError) {
      if (err.code === "UNAUTHENTICATED") {
        redirect(`/login?next=/i/${encodeURIComponent(slug)}`);
      }
      if (err.code === "NOT_FOUND") notFound();
      return <ForbiddenPage message={err.message} />;
    }
    if (err instanceof ForbiddenError) {
      return <ForbiddenPage message={err.message} />;
    }
    throw err;
  }
}
