import { Resend } from "resend";
import type { ReactElement } from "react";

export class EmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailError";
  }
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function getClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new EmailError("RESEND_API_KEY is not set");
  return new Resend(key);
}

function fromAddress() {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new EmailError("RESEND_FROM_EMAIL is not set");
  return from;
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  react: ReactElement;
  idempotencyKey?: string;
}): Promise<{ id: string | null }> {
  if (!isResendConfigured()) {
    throw new EmailError("Resend is not configured");
  }

  const resend = getClient();
  const { data, error } = await resend.emails.send(
    {
      from: fromAddress(),
      to: opts.to,
      subject: opts.subject,
      react: opts.react,
    },
    opts.idempotencyKey
      ? { idempotencyKey: opts.idempotencyKey }
      : undefined,
  );

  if (error) {
    throw new EmailError(error.message);
  }
  return { id: data?.id ?? null };
}
