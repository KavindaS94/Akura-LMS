import Link from "next/link";

const features = [
  {
    title: "Students & registration",
    body: "Roster, classes, guardians, and self-registration links with a QR. Approve applications before a seat is consumed.",
  },
  {
    title: "Attendance",
    body: "A three-tap session flow for teachers. Offline-friendly drafts, session locking, and per-class reports.",
  },
  {
    title: "Exams & marks",
    body: "Mark entry grids that teachers draft and admins publish. Guardians see results the moment they go live.",
  },
  {
    title: "Courses & content",
    body: "Modules, resources, and drip release. Built by your teachers, delivered to your students.",
  },
  {
    title: "Guardian email",
    body: "Attendance, results, and announcements sent straight to guardians — no portal, no passwords to manage.",
  },
  {
    title: "Capacity plans",
    body: "Pay for size, not features. Every institute gets everything; plans scale with students, staff, and storage.",
  },
];

const steps = [
  { n: "01", title: "Create your institute", body: "Sign up, set your brand colour, and invite staff in minutes." },
  { n: "02", title: "Add students and classes", body: "Import a CSV or publish a registration link for families to join." },
  { n: "03", title: "Teach, track, publish", body: "Run sessions, mark exams, and publish results to guardians by email." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-ink/10 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-bold text-white">
              A
            </span>
            <span
              className="text-lg font-semibold tracking-tight text-ink"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Akura
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#features" className="hidden text-ink/70 transition-colors hover:text-ink sm:block">
              Features
            </a>
            <a href="#how" className="hidden text-ink/70 transition-colors hover:text-ink sm:block">
              How it works
            </a>
            <Link href="/login" className="text-ink/70 transition-colors hover:text-ink">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-accent/90 hover:shadow"
            >
              Start free trial
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium tracking-[0.2em] text-accent uppercase">
            For tuition institutes & private schools
          </p>
          <h1
            className="mt-5 text-4xl font-semibold tracking-tight text-ink sm:text-6xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Every institute deserves its own learning platform
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
            Akura brings attendance, exams, courses, and guardian email together in one
            white-label workspace — scaled to your capacity, never your features.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-accent/90 hover:shadow"
            >
              Start your free trial
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-ink/15 bg-white px-6 py-3 text-sm font-medium text-ink shadow-sm transition-colors hover:border-ink/30"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-ink/10 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-2 pb-4">
            <span className="h-3 w-3 rounded-full bg-danger/70" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-success/70" />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["Students", "128"],
              ["Today's sessions", "4"],
              ["Attendance", "96%"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-surface px-4 py-5">
                <p className="text-2xl font-semibold text-ink">{value}</p>
                <p className="mt-1 text-xs text-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-ink/10 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <h2
              className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              One platform. Every feature.
            </h2>
            <p className="mt-4 text-lg text-muted">
              Plans differ only in size. The software is the same for every institute — so
              teachers and admins always know where things are.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-ink/10 bg-surface/50 p-6 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm"
              >
                <div className="h-1.5 w-8 rounded-full bg-accent" />
                <h3 className="mt-4 font-semibold text-ink">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <h2
              className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Up and running in an afternoon
            </h2>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="flex gap-4">
                <span className="font-semibold text-accent" style={{ fontFamily: "var(--font-display), serif" }}>
                  {s.n}
                </span>
                <div>
                  <h3 className="font-semibold text-ink">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-ink/10 bg-white py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2
            className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Bring your institute to Akura
          </h2>
          <p className="mt-4 text-lg text-muted">
            Start free, invite your staff, and register your first students today.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-lg bg-accent px-8 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-accent/90 hover:shadow"
          >
            Start free trial
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink/10 bg-surface py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted sm:flex-row">
          <p>
            <span className="font-semibold text-ink">Akura</span> by Elgiriya Innovations
          </p>
          <p>Attendance · Exams · Courses · Guardian email</p>
        </div>
      </footer>
    </main>
  );
}
