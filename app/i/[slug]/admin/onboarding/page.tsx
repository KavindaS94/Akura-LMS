import { requireRole } from "@/lib/tenant/context";
import { ADMIN_ROLES } from "@/lib/rbac";
import { OnboardingForm } from "@/components/auth-forms";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireRole(slug, ADMIN_ROLES);

  return (
    <section>
      <h2
        className="text-2xl font-semibold"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Onboarding
      </h2>
      <p className="mt-2 text-muted">
        Set timezone and brand accent. More settings arrive in Phase 3.
      </p>
      <OnboardingForm slug={slug} />
    </section>
  );
}
