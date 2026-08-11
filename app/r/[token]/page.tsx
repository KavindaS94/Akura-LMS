import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { PublicRegistrationForm } from "@/components/people-forms";

export const dynamic = "force-dynamic";

async function loadByToken(token: string) {
  const result = await db.execute<{
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
  }>(sql`SELECT * FROM app_resolve_registration_link(${token})`);
  return result.rows[0] ?? null;
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
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">Link unavailable</h1>
        <p className="mt-2 text-muted">Ask your institute for a new registration link.</p>
      </main>
    );
  }

  const accent = link.accent_color ?? "#E4761B";

  return (
    <main
      className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12"
      style={{ ["--accent" as string]: accent }}
    >
      <p className="text-xs tracking-[0.2em] text-muted uppercase">Akura</p>
      <h1
        className="mt-3 text-3xl font-semibold text-ink"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        {link.tenant_name}
      </h1>
      <p className="mt-2 text-muted">
        {link.label}
        {link.class_name ? ` · ${link.class_name}` : ""}
      </p>
      <PublicRegistrationForm
        token={token}
        collectGuardian={link.collect_guardian}
        src={src}
      />
    </main>
  );
}
