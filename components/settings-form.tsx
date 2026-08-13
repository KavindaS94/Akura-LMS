"use client";

import { useActionState } from "react";
import { saveSettingsAction, type SettingsFormState } from "@/lib/settings/actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/feedback";

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
    <form action={formAction} className="space-y-6">
      <ul className="divide-y divide-ink/10">
        {settings.map(({ definition, value }) => {
          const v = definition.validation ?? {};
          return (
            <li key={definition.key} className="flex flex-col gap-2 py-4">
              <span className="text-sm font-medium text-ink">{definition.label}</span>
              <span className="text-xs text-muted">
                {definition.description} · <code>{definition.key}</code>
              </span>
              {definition.type === "boolean" ? (
                <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    name={definition.key}
                    defaultChecked={Boolean(value)}
                    className="h-4 w-4 rounded border-ink/20 accent-[var(--accent)]"
                  />
                  Enabled
                </label>
              ) : null}
              {definition.type === "number" ? (
                <Input
                  type="number"
                  name={definition.key}
                  defaultValue={Number(value)}
                  min={typeof v.min === "number" ? v.min : undefined}
                  max={typeof v.max === "number" ? v.max : undefined}
                  className="max-w-xs"
                />
              ) : null}
              {definition.type === "string" ? (
                <Input
                  type="text"
                  name={definition.key}
                  defaultValue={String(value ?? "")}
                  className="max-w-xs"
                />
              ) : null}
              {definition.type === "enum" ? (
                <Select name={definition.key} defaultValue={String(value ?? "")} className="max-w-xs">
                  {(Array.isArray(v.options) ? (v.options as string[]) : []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
              ) : null}
              {definition.type === "json" ? (
                <Textarea
                  name={definition.key}
                  defaultValue={JSON.stringify(value ?? {}, null, 2)}
                  className="max-w-lg font-mono text-xs"
                  rows={4}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
      {state?.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state?.ok ? <Alert tone="success">{state.ok}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
