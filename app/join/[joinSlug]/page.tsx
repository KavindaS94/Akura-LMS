import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rowsOf } from "@/lib/db/result";
import { PublicRegistrationForm } from "@/components/people-forms";
import { AuthShell, AuthCardNotice } from "@/components/auth-shell";

export const dynamic = "force-dynamic";

async function loadByJoinSlug(joinSlug: string) {
  const result = await db.execute(
    sql`SELECT * FROM app_resolve_registration_by_join_slug(${joinSlug})`,
  );
  return (
    rowsOf<{
      token: string;
      tenant_name: string;
      accent_color: string | null;
      logo_url: string | null;
      label: string;
      class_name: string | null;
      collect_guardian: boolean;
      is_active: boolean;
      expires_at: Date | null;
      max_uses: number | null;
      use_count: number;
      deleted_at: Date | null;
    }>(result)[0] ?? null
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ joinSlug: string }>;
}): Promise<Metadata> {
  const { joinSlug } = await params;
  const link = await loadByJoinSlug(joinSlug);
  if (!link) return { title: "Join" };
  return {
    title: `Join ${link.tenant_name}`,
    description: `Register with ${link.tenant_name} on Akura`,
    openGraph: {
      title: `Join ${link.tenant_name}`,
      description: link.label,
      images: link.logo_url ? [{ url: link.logo_url }] : undefined,
    },
  };
}

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ joinSlug: string }>;
  searchParams: Promise<{ src?: string }>;
}) {
  const { joinSlug } = await params;
  const { src } = await searchParams;
  const link = await loadByJoinSlug(joinSlug);

  if (
    !link ||
    link.deleted_at ||
    !link.is_active ||
    (link.expires_at && new Date(link.expires_at) < new Date()) ||
    (link.max_uses != null && link.use_count >= link.max_uses)
  ) {
    return <AuthCardNotice title="Not found" />;
  }

  const accent = link.accent_color ?? "#E4761B";

  return (
    <div style={{ ["--accent" as string]: accent }}>
      <AuthShell
        eyebrow="Register with"
        title={link.tenant_name}
        subtitle={link.label}
      >
        <PublicRegistrationForm
          token={link.token}
          collectGuardian={link.collect_guardian}
          src={src}
        />
      </AuthShell>
    </div>
  );
}
