"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  startPayHereCheckoutAction,
  submitBankTransferAction,
  cancelAtPeriodEndAction,
  downgradeToFreeAction,
  type BillingFormState,
} from "@/capabilities/billing/lib/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Alert } from "@/components/ui/feedback";

function PayHereRedirect({ state }: { state: BillingFormState }) {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.checkoutUrl && state.fields) {
      formRef.current?.submit();
    }
  }, [state]);

  if (!state?.checkoutUrl || !state.fields) return null;
  return (
    <form ref={formRef} method="post" action={state.checkoutUrl} className="hidden">
      {Object.entries(state.fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </form>
  );
}

type DiagnosticsResult = {
  configured: boolean;
  checkoutUrl: string;
  notifyUrl: string | null;
  allChecksPassed: boolean;
  checks: { name: string; ok: boolean; detail: string }[];
  error?: string;
};

function PayHereDiagnostics({ slug }: { slug: string }) {
  const [result, setResult] = useState<DiagnosticsResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/health/payhere?slug=${encodeURIComponent(slug)}`,
        { cache: "no-store" },
      );
      setResult((await res.json()) as DiagnosticsResult);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 border-t border-ink/10 pt-4">
      <Button type="button" variant="ghost" size="sm" onClick={run} disabled={loading}>
        {loading ? "Checking…" : "Check PayHere configuration"}
      </Button>
      {result?.error ? (
        <div className="mt-3">
          <Alert tone="error">{result.error}</Alert>
        </div>
      ) : null}
      {result && !result.error ? (
        <div className="mt-3 space-y-2">
          <ul className="space-y-1.5 text-sm">
            {result.checks.map((c) => (
              <li key={c.name} className="flex gap-2">
                <span className={c.ok ? "text-success" : "text-danger"}>
                  {c.ok ? "✓" : "✕"}
                </span>
                <span>
                  <code className="text-xs text-ink">{c.name}</code>
                  <span className="ml-2 text-muted">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs break-all text-muted">
            Checkout: <code className="text-ink/70">{result.checkoutUrl}</code>
          </p>
          {result.notifyUrl ? (
            <p className="text-xs break-all text-muted">
              notify_url: <code className="text-ink/70">{result.notifyUrl}</code>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function OwnerBillingPanel({
  slug,
  cancelAtPeriodEnd,
  payHereReady,
  bank,
}: {
  slug: string;
  cancelAtPeriodEnd: boolean;
  payHereReady: boolean;
  bank: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch: string;
  };
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const checkoutAction = startPayHereCheckoutAction.bind(null, slug);
  const bankAction = submitBankTransferAction.bind(null, slug);
  const [checkoutState, checkoutFormAction, checkoutPending] = useActionState<
    BillingFormState,
    FormData
  >(checkoutAction, null);
  const [bankState, bankFormAction, bankPending] = useActionState<
    BillingFormState,
    FormData
  >(bankAction, null);

  return (
    <div className="space-y-6">
      <PayHereRedirect state={checkoutState} />

      <Card
        title="Pay with PayHere"
        description={
          payHereReady
            ? "Recurring card payment (Growth or Scale). Checkout opens on PayHere."
            : "Configure PAYHERE_* env vars to enable."
        }
      >
        <form action={checkoutFormAction} className="mt-4 flex flex-wrap gap-3">
          <Select name="planKey" defaultValue="growth" className="w-36">
            <option value="growth">Growth</option>
            <option value="scale">Scale</option>
          </Select>
          <Select name="billingCycle" defaultValue="monthly" className="w-32">
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </Select>
          <Button type="submit" disabled={!payHereReady || checkoutPending}>
            {checkoutPending ? "Starting…" : "Pay with PayHere"}
          </Button>
        </form>
        {checkoutState?.error ? (
          <div className="mt-3">
            <Alert tone="error">{checkoutState.error}</Alert>
          </div>
        ) : null}
        <PayHereDiagnostics slug={slug} />
      </Card>

      <Card title="Bank transfer" description="Submit your reference after transferring.">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {[
            ["Bank", bank.bankName],
            ["Account name", bank.accountName],
            ["Account number", bank.accountNumber],
            ["Branch", bank.branch],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted uppercase">{label}</dt>
              <dd className="mt-0.5 font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <form action={bankFormAction} className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <Select name="planKey" defaultValue="growth" className="w-36">
              <option value="growth">Growth</option>
              <option value="scale">Scale</option>
            </Select>
            <Select name="billingCycle" defaultValue="monthly" className="w-32">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </div>
          <Input name="reference" required placeholder="Transfer reference / slip no." className="max-w-md" />
          <Input name="note" placeholder="Optional note" className="max-w-md" />
          <Button type="submit" disabled={bankPending} variant="secondary">
            {bankPending ? "Submitting…" : "Submit transfer"}
          </Button>
        </form>
        {bankState?.error ? (
          <div className="mt-3">
            <Alert tone="error">{bankState.error}</Alert>
          </div>
        ) : null}
        {bankState?.ok ? (
          <div className="mt-3">
            <Alert tone="success">{bankState.ok}</Alert>
          </div>
        ) : null}
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setMsg(null);
            start(async () => {
              const res = await cancelAtPeriodEndAction(slug, !cancelAtPeriodEnd);
              setMsg(res?.error ?? res?.ok ?? null);
              router.refresh();
            });
          }}
        >
          {cancelAtPeriodEnd ? "Keep subscription" : "Cancel at period end"}
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={pending}
          onClick={() => {
            setMsg(null);
            start(async () => {
              const res = await downgradeToFreeAction(slug);
              setMsg(res?.error ?? res?.ok ?? null);
              router.refresh();
            });
          }}
        >
          Downgrade to Free now
        </Button>
      </div>
      {msg ? <p className="text-sm text-muted">{msg}</p> : null}
    </div>
  );
}
