import { loadRegistrationLinksPage } from "@/capabilities/students/lib/actions";
import { CreateRegLinkForm } from "@/components/people-forms";

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
      <div>
        <h2
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Registration links
        </h2>
        <p className="mt-2 text-muted">
          Vanity <code>/join/…</code> for posters; token <code>/r/…</code> is revocable.
          Approval is the control — not guessability.
        </p>
        <CreateRegLinkForm slug={slug} classes={classes} />
      </div>

      <ul className="space-y-4">
        {links.map((link) => {
          const tokenUrl = `/r/${link.token}`;
          const joinUrl = link.slug ? `/join/${link.slug}` : null;
          const qrPng = `/api/qr?data=${encodeURIComponent(tokenUrl)}&format=png`;
          const qrSvg = `/api/qr?data=${encodeURIComponent(tokenUrl)}&format=svg`;
          const snippet = `<a href="${tokenUrl}">Register for ${link.label}</a>`;
          return (
            <li key={link.id} className="rounded-md border border-ink/10 bg-white p-4 text-sm">
              <p className="font-medium">{link.label}</p>
              <p className="mt-1 text-muted">
                uses {link.useCount}
                {link.maxUses != null ? ` / ${link.maxUses}` : ""} ·{" "}
                {link.isActive ? "active" : "inactive"}
              </p>
              <p className="mt-2 break-all">
                Token: <code>{tokenUrl}</code>
              </p>
              {joinUrl ? (
                <p className="break-all">
                  Join: <code>{joinUrl}</code>
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-end gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrPng} alt="QR PNG" width={120} height={120} />
                <div className="space-y-1">
                  <a className="text-accent" href={qrPng} download>
                    Download PNG
                  </a>
                  <br />
                  <a className="text-accent" href={qrSvg} download>
                    Download SVG
                  </a>
                </div>
              </div>
              <pre className="mt-3 overflow-x-auto rounded bg-surface p-2 text-xs">{snippet}</pre>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
