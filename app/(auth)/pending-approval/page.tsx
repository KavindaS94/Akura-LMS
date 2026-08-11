import Link from "next/link";

export default function PendingApprovalPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16 text-center">
      <p className="text-xs tracking-[0.2em] text-muted uppercase">Akura</p>
      <h1
        className="mt-4 text-3xl font-semibold"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Application under review
      </h1>
      <p className="mt-3 text-muted">
        Your account is verified. An institute admin must approve you before you can
        enter a workspace. Pending applications do not use a seat.
      </p>
      <Link href="/login" className="mt-8 text-sm text-accent">
        Sign in later
      </Link>
    </main>
  );
}
