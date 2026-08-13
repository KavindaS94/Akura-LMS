import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { AuthShell } from "@/components/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in"
      subtitle="Use your institute account."
      footer={
        <>
          New institute?{" "}
          <Link href="/signup" className="font-medium text-accent">
            Create one
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
