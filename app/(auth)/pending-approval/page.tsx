import { AuthCardNotice } from "@/components/auth-shell";

export default function PendingApprovalPage() {
  return (
    <AuthCardNotice
      title="Application under review"
      body="Your account is verified. An institute admin must approve you before you can enter a workspace. Pending applications do not use a seat."
      action={{ href: "/login", label: "Sign in later" }}
    />
  );
}
