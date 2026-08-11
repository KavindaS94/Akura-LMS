"use server";

import { requireRole } from "@/lib/tenant/context";
import { ADMIN_ROLES } from "@/lib/rbac";
import { listTenantSettings, setSetting, listSettingDefinitions } from "@/lib/settings";
import { getCurrentSubscription, getUsageSnapshot } from "@/lib/billing/quota";

export type SettingsFormState = { error?: string; ok?: string } | null;

export async function saveSettingsAction(
  slug: string,
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const ctx = await requireRole(slug, ADMIN_ROLES);
  const defs = await listSettingDefinitions();

  try {
    for (const def of defs) {
      if (!formData.has(def.key)) continue;
      const raw = formData.get(def.key);
      let value: unknown = raw;
      if (def.type === "boolean") {
        value = raw === "on" || raw === "true";
      } else if (def.type === "number") {
        value = Number(raw);
      } else if (def.type === "json") {
        value = JSON.parse(String(raw));
      } else {
        value = String(raw);
      }
      await setSetting({
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        key: def.key,
        value,
      });
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save settings." };
  }

  return { ok: "Settings saved. Changes are not retroactive for frozen records." };
}

export async function loadSettingsPage(slug: string) {
  const ctx = await requireRole(slug, ADMIN_ROLES);
  const [settings, subscription, usage] = await Promise.all([
    listTenantSettings(ctx.tenantId, ctx.user.id),
    getCurrentSubscription(ctx.tenantId, ctx.user.id),
    getUsageSnapshot(ctx.tenantId, ctx.user.id),
  ]);
  return { ctx, settings, subscription, usage };
}

export async function loadBillingPage(slug: string) {
  const ctx = await requireRole(slug, ADMIN_ROLES);
  const [subscription, usage] = await Promise.all([
    getCurrentSubscription(ctx.tenantId, ctx.user.id),
    getUsageSnapshot(ctx.tenantId, ctx.user.id),
  ]);
  return { ctx, subscription, usage };
}
