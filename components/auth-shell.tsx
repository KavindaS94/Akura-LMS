import Link from "next/link";

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-bold text-white">
          A
        </span>
        <span
          className="text-xl font-semibold tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Akura
        </span>
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-ink/10 bg-white p-8 shadow-sm">
        {eyebrow ? (
          <p className="text-xs font-medium tracking-[0.2em] text-accent uppercase">{eyebrow}</p>
        ) : null}
        <h1
          className="text-2xl font-semibold tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {title}
        </h1>
        {subtitle ? <p className="mt-2 text-sm text-muted">{subtitle}</p> : null}
        {children}
      </div>
      {footer ? (
        <p className="mt-6 text-sm text-muted">{footer}</p>
      ) : null}
    </main>
  );
}

export function AuthCardNotice({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: { href: string; label: string };
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-ink/10 bg-white p-8 text-center shadow-sm">
        <h1
          className="text-2xl font-semibold tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {title}
        </h1>
        {body ? <p className="mt-3 text-sm text-muted">{body}</p> : null}
        {action ? (
          <Link
            href={action.href}
            className="mt-6 inline-block text-sm font-medium text-accent"
          >
            {action.label}
          </Link>
        ) : null}
      </div>
    </main>
  );
}
