import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rowsOf } from "@/lib/db/result";
import { PublicRegistrationForm } from "@/components/people-forms";
import { AuthShell, AuthCardNotice } from "@/components/auth-shell";

export const dynamic = "force-dynamic";

async function loadByToken(token: string) {
  const result = await db.execute(
    sql`SELECT * FROM app_resolve_registration_link(${token})`,
  );
  return (
    rowsOf<{
      id: string;
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
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const link = await loadByToken(token);
  if (!link) return { title: "Registration", robots: { index: false, follow: false } };
  return {
    title: `${link.label} · ${link.tenant_name}`,
    description: `Register for ${link.tenant_name}`,
    robots: { index: false, follow: false },
    openGraph: {
      title: `${link.label} · ${link.tenant_name}`,
      description: `Apply to join ${link.tenant_name}`,
      images: link.logo_url ? [{ url: link.logo_url }] : undefined,
    },
  };
}

export default async function TokenRegistrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ src?: string }>;
}) {
  const { token } = await params;
  const { src } = await searchParams;
  const link = await loadByToken(token);

  if (
    !link ||
    link.deleted_at ||
    !link.is_active ||
    (link.expires_at && new Date(link.expires_at) < new Date()) ||
    (link.max_uses != null && link.use_count >= link.max_uses)
  ) {
    return (
      <AuthCardNotice
        title="Link unavailable"
        body="Ask your institute for a new registration link."
      />
    );
  }

  const accent = link.accent_color ?? "#E4761B";

  return (
    <div style={{ ["--accent" as string]: accent }}>
      <AuthShell
        eyebrow="Register with"
        title={link.tenant_name}
        subtitle={
          <>
            {link.label}
            {link.class_name ? ` · ${link.class_name}` : ""}
          </>
        }
      >
        <PublicRegistrationForm
          token={token}
          collectGuardian={link.collect_guardian}
          src={src}
        />
      </AuthShell>
    </div>
  );
}
