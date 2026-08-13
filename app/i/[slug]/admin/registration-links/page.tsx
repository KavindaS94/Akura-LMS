import { loadRegistrationLinksPage } from "@/capabilities/students/lib/actions";
import { CreateRegLinkForm } from "@/components/people-forms";
import { Card, EmptyState } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function RegistrationLinksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { links, classes } = await loadRegistrationLinksPage(slug);

  return (
    <section className="space-y-8">
      <PageHeader
        title="Registration links"
        subtitle={
          <>
            Vanity <code className="text-ink/70">/join/…</code> for posters; token{" "}
            <code className="text-ink/70">/r/…</code> is revocable. Approval is the control —
            not guessability.
          </>
        }
      />

      <Card title="Create a registration link" description="Share it in print or by message.">
        <CreateRegLinkForm slug={slug} classes={classes} />
      </Card>

      {links.length === 0 ? (
        <EmptyState
          title="No registration links yet"
          description="Create a link above to let families self-register."
        />
      ) : (
        <ul className="space-y-4">
          {links.map((link) => {
            const tokenUrl = `/r/${link.token}`;
            const joinUrl = link.slug ? `/join/${link.slug}` : null;
            const qrPng = `/api/qr?data=${encodeURIComponent(tokenUrl)}&format=png`;
            const qrSvg = `/api/qr?data=${encodeURIComponent(tokenUrl)}&format=svg`;
            const snippet = `<a href="${tokenUrl}">Register for ${link.label}</a>`;
            return (
              <li key={link.id} className="rounded-xl border border-ink/10 bg-white p-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-ink">{link.label}</p>
                  <Badge tone={link.isActive ? "success" : "neutral"}>
                    {link.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {link.useCount}
                  {link.maxUses != null ? ` / ${link.maxUses}` : ""} uses
                </p>
                <div className="mt-3 space-y-1 break-all text-sm">
                  <p>
                    Token: <code className="text-ink/80">{tokenUrl}</code>
                  </p>
                  {joinUrl ? (
                    <p>
                      Join: <code className="text-ink/80">{joinUrl}</code>
                    </p>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap items-end gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrPng}
                    alt={`QR code for ${link.label}`}
                    width={120}
                    height={120}
                    className="rounded-lg border border-ink/10"
                  />
                  <div className="space-y-1 text-sm">
                    <a className="block text-accent hover:underline" href={qrPng} download>
                      Download PNG
                    </a>
                    <a className="block text-accent hover:underline" href={qrSvg} download>
                      Download SVG
                    </a>
                  </div>
                </div>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-surface p-3 text-xs">{snippet}</pre>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
