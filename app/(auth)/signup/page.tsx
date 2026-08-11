import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="text-sm text-muted">
        ← Akura
      </Link>
      <h1
        className="mt-6 text-3xl font-semibold text-ink"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Create your institute
      </h1>
      <p className="mt-2 text-muted">
        You become the Owner (billing admin). Teachers and students join by invite.
      </p>
      <SignupForm />
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent">
          Sign in
        </Link>
      </p>
    </main>
  );
}
