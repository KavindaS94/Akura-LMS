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
    <div className="space-y-8">
      <PayHereRedirect state={checkoutState} />

      <section className="rounded-md border border-ink/10 bg-white p-4">
        <h3 className="font-semibold">Pay with PayHere</h3>
        <p className="mt-1 text-sm text-muted">
          Recurring card payment (Growth or Scale).{" "}
          {payHereReady
            ? "Checkout opens on PayHere."
            : "Configure PAYHERE_* env vars to enable."}
        </p>
        <form action={checkoutFormAction} className="mt-4 flex flex-wrap gap-3">
          <select
            name="planKey"
            defaultValue="growth"
            className="rounded-md border border-ink/15 px-3 py-2 text-sm"
          >
            <option value="growth">Growth</option>
            <option value="scale">Scale</option>
          </select>
          <select
            name="billingCycle"
            defaultValue="monthly"
            className="rounded-md border border-ink/15 px-3 py-2 text-sm"
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <button
            type="submit"
            disabled={!payHereReady || checkoutPending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {checkoutPending ? "Starting…" : "Pay with PayHere"}
          </button>
        </form>
        {checkoutState?.error ? (
          <p className="mt-2 text-sm text-danger">{checkoutState.error}</p>
        ) : null}
      </section>

      <section className="rounded-md border border-ink/10 bg-white p-4">
        <h3 className="font-semibold">Bank transfer</h3>
        <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Bank</dt>
            <dd>{bank.bankName}</dd>
          </div>
          <div>
            <dt className="text-muted">Account name</dt>
            <dd>{bank.accountName}</dd>
          </div>
          <div>
            <dt className="text-muted">Account number</dt>
            <dd>{bank.accountNumber}</dd>
          </div>
          <div>
            <dt className="text-muted">Branch</dt>
            <dd>{bank.branch}</dd>
          </div>
        </dl>
        <form action={bankFormAction} className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <select
              name="planKey"
              defaultValue="growth"
              className="rounded-md border border-ink/15 px-3 py-2 text-sm"
            >
              <option value="growth">Growth</option>
              <option value="scale">Scale</option>
            </select>
            <select
              name="billingCycle"
              defaultValue="monthly"
              className="rounded-md border border-ink/15 px-3 py-2 text-sm"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <input
            name="reference"
            required
            placeholder="Transfer reference / slip no."
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm"
          />
          <input
            name="note"
            placeholder="Optional note"
            className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={bankPending}
            className="rounded-md border border-ink/20 px-4 py-2 text-sm font-medium"
          >
            {bankPending ? "Submitting…" : "Submit transfer"}
          </button>
        </form>
        {bankState?.error ? (
          <p className="mt-2 text-sm text-danger">{bankState.error}</p>
        ) : null}
        {bankState?.ok ? (
          <p className="mt-2 text-sm text-success">{bankState.ok}</p>
        ) : null}
      </section>

      <section className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          className="rounded-md border border-ink/20 px-4 py-2 text-sm"
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
        </button>
        <button
          type="button"
          disabled={pending}
          className="rounded-md border border-danger/40 px-4 py-2 text-sm text-danger"
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
        </button>
      </section>
      {msg ? <p className="text-sm text-muted">{msg}</p> : null}
    </div>
  );
}
