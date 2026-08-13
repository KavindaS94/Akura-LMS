import { requireRole } from "@/lib/tenant/context";
import { ADMIN_ROLES } from "@/lib/rbac";
import { OnboardingForm } from "@/components/auth-forms";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireRole(slug, ADMIN_ROLES);

  return (
    <section className="space-y-8">
      <PageHeader
        title="Onboarding"
        subtitle="Set timezone and brand accent. More settings arrive in Phase 3."
      />
      <Card title="Workspace setup">
        <OnboardingForm slug={slug} />
      </Card>
    </section>
  );
}