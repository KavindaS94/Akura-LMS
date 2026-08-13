import { Alert } from "./feedback";

export function FormStatus({
  state,
}: {
  state: {
    error?: string;
    ok?: string;
    csvErrors?: string[];
    inviteUrl?: string;
    joinUrl?: string;
  } | null;
}) {
  if (!state) return null;
  return (
    <div className="space-y-1.5 text-sm">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="success">{state.ok}</Alert> : null}
      {state.inviteUrl ? (
        <p className="break-all text-xs text-muted">
          Invite link: <code className="text-ink">{state.inviteUrl}</code>
        </p>
      ) : null}
      {state.joinUrl ? (
        <p className="break-all text-xs text-muted">
          Registration link: <code className="text-ink">{state.joinUrl}</code>
        </p>
      ) : null}
      {state.csvErrors?.length ? (
        <Alert tone="error" title={`${state.csvErrors.length} row(s) rejected`}>
          <ul className="list-disc pl-4">
            {state.csvErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
    </div>
  );
}