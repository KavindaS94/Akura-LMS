import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="text-sm text-muted">
        ← Akura
      </Link>
      <h1
        className="mt-6 text-3xl font-semibold text-ink"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Sign in
      </h1>
      <p className="mt-2 text-muted">Use your institute account.</p>
      <LoginForm />
      <p className="mt-6 text-sm text-muted">
        New institute?{" "}
        <Link href="/signup" className="text-accent">
          Create one
        </Link>
      </p>
    </main>
  );
}
