import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant/context";
import { roleHomePath } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function TenantIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await getTenantContext(slug);
  redirect(roleHomePath(ctx.slug, ctx.membership.role));
}
