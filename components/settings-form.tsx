"use client";

import { useActionState } from "react";
import { saveSettingsAction, type SettingsFormState } from "@/lib/settings/actions";

type SettingRow = {
  definition: {
    key: string;
    type: string;
    label: string;
    description: string;
    validation: Record<string, unknown>;
  };
  value: unknown;
};

const initial: SettingsFormState = null;

export function SettingsForm({
  slug,
  settings,
}: {
  slug: string;
  settings: SettingRow[];
}) {
  const action = saveSettingsAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="mt-6 space-y-6">
      {settings.map(({ definition, value }) => {
        const v = definition.validation ?? {};
        return (
          <label key={definition.key} className="flex flex-col gap-1 border-b border-ink/10 pb-4">
            <span className="text-sm font-medium text-ink">{definition.label}</span>
            <span className="text-xs text-muted">
              {definition.description} · <code>{definition.key}</code>
            </span>
            {definition.type === "boolean" ? (
              <input
                type="checkbox"
                name={definition.key}
                defaultChecked={Boolean(value)}
                className="mt-2 h-4 w-4"
              />
            ) : null}
            {definition.type === "number" ? (
              <input
                type="number"
                name={definition.key}
                defaultValue={Number(value)}
                min={typeof v.min === "number" ? v.min : undefined}
                max={typeof v.max === "number" ? v.max : undefined}
                className="mt-2 rounded-md border border-ink/15 px-3 py-2"
              />
            ) : null}
            {definition.type === "string" ? (
              <input
                type="text"
                name={definition.key}
                defaultValue={String(value ?? "")}
                className="mt-2 rounded-md border border-ink/15 px-3 py-2"
              />
            ) : null}
            {definition.type === "enum" ? (
              <select
                name={definition.key}
                defaultValue={String(value ?? "")}
                className="mt-2 rounded-md border border-ink/15 px-3 py-2"
              >
                {(Array.isArray(v.options) ? (v.options as string[]) : []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : null}
            {definition.type === "json" ? (
              <textarea
                name={definition.key}
                defaultValue={JSON.stringify(value ?? {}, null, 2)}
                className="mt-2 rounded-md border border-ink/15 px-3 py-2 font-mono text-xs"
                rows={4}
              />
            ) : null}
          </label>
        );
      })}
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm text-success">{state.ok}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
