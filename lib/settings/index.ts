import { and, eq } from "drizzle-orm";
import {
  settingDefinitions,
  settingHistory,
  tenantSettings,
  type SettingDefinition,
} from "@/lib/db/schema";
import { withTenant, type Tx } from "@/lib/db/tenant";
import { db } from "@/lib/db";
import { rowsOf } from "@/lib/db/result";
import { sql } from "drizzle-orm";

export class SettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsError";
  }
}

export async function listSettingDefinitions(): Promise<SettingDefinition[]> {
  const result = await db.execute(
    sql`SELECT * FROM app_list_setting_definitions()`,
  );
  return rowsOf<Record<string, unknown>>(result).map((row) => ({
    key: row.key as string,
    capability: row.capability as string,
    type: row.type as string,
    defaultValue: row.default_value,
    validation: ((row.validation as Record<string, unknown>) ?? {}) as Record<
      string,
      unknown
    >,
    label: row.label as string,
    description: (row.description as string) ?? "",
    scope: row.scope as string,
    requiresRole: row.requires_role as SettingDefinition["requiresRole"],
    createdAt: new Date(row.created_at as string | Date),
  }));
}

function validateValue(def: SettingDefinition, value: unknown): unknown {
  const v = def.validation ?? {};
  switch (def.type) {
    case "boolean":
      if (typeof value !== "boolean") throw new SettingsError("Expected boolean");
      return value;
    case "number": {
      if (typeof value !== "number" || Number.isNaN(value)) {
        throw new SettingsError("Expected number");
      }
      if (typeof v.min === "number" && value < v.min) {
        throw new SettingsError(`Min ${v.min}`);
      }
      if (typeof v.max === "number" && value > v.max) {
        throw new SettingsError(`Max ${v.max}`);
      }
      return value;
    }
    case "string": {
      if (typeof value !== "string") throw new SettingsError("Expected string");
      if (typeof v.maxLength === "number" && value.length > v.maxLength) {
        throw new SettingsError("Too long");
      }
      return value;
    }
    case "enum": {
      const options = Array.isArray(v.options) ? (v.options as string[]) : [];
      if (typeof value !== "string" || !options.includes(value)) {
        throw new SettingsError("Invalid option");
      }
      return value;
    }
    case "json":
      return value;
    default:
      throw new SettingsError("Unknown setting type");
  }
}

export async function getSetting<T = unknown>(
  tenantId: string,
  userId: string,
  key: string,
): Promise<T> {
  return withTenant({ tenantId, userId }, async (tx) => {
    const defRows = await tx
      .select()
      .from(settingDefinitions)
      .where(eq(settingDefinitions.key, key))
      .limit(1);
    const def = defRows[0];
    if (!def) throw new SettingsError(`Unknown setting: ${key}`);

    const rows = await tx
      .select()
      .from(tenantSettings)
      .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key)))
      .limit(1);

    if (rows[0]) return rows[0].value as T;
    return def.defaultValue as T;
  });
}

export async function listTenantSettings(tenantId: string, userId: string) {
  const defs = await listSettingDefinitions();
  return withTenant({ tenantId, userId }, async (tx) => {
    const overrides = await tx
      .select()
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId));
    const byKey = new Map(overrides.map((o) => [o.key, o.value]));
    return defs.map((def) => ({
      definition: def,
      value: byKey.has(def.key) ? byKey.get(def.key)! : def.defaultValue,
      isOverride: byKey.has(def.key),
    }));
  });
}

export async function setSetting(
  opts: {
    tenantId: string;
    userId: string;
    key: string;
    value: unknown;
  },
  tx?: Tx,
) {
  const run = async (inner: Tx) => {
    const defRows = await inner
      .select()
      .from(settingDefinitions)
      .where(eq(settingDefinitions.key, opts.key))
      .limit(1);
    const def = defRows[0];
    if (!def) throw new SettingsError(`Unknown setting: ${opts.key}`);
    const value = validateValue(def, opts.value);

    const existing = await inner
      .select()
      .from(tenantSettings)
      .where(
        and(
          eq(tenantSettings.tenantId, opts.tenantId),
          eq(tenantSettings.key, opts.key),
        ),
      )
      .limit(1);

    const oldValue = existing[0]?.value ?? def.defaultValue;

    if (existing[0]) {
      await inner
        .update(tenantSettings)
        .set({
          value,
          updatedByAuthUserId: opts.userId,
          updatedAt: new Date(),
        })
        .where(eq(tenantSettings.id, existing[0].id));
    } else {
      await inner.insert(tenantSettings).values({
        tenantId: opts.tenantId,
        key: opts.key,
        value,
        updatedByAuthUserId: opts.userId,
      });
    }

    await inner.insert(settingHistory).values({
      tenantId: opts.tenantId,
      key: opts.key,
      oldValue,
      newValue: value,
      changedByAuthUserId: opts.userId,
    });

    return value;
  };

  if (tx) return run(tx);
  return withTenant({ tenantId: opts.tenantId, userId: opts.userId }, run);
}
