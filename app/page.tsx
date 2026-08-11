import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-[0.2em] text-accent uppercase">
        Elgiriya Innovations
      </p>
      <h1
        className="mt-4 text-5xl font-semibold tracking-tight text-ink sm:text-6xl"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Akura
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        A multi-tenant learning platform for institutes — attendance, exams,
        courses, and guardian email. Capacity plans, every feature included.
      </p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/signup"
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white"
        >
          Start free trial
        </Link>
        <Link
          href="/login"
          className="rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-surface"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
