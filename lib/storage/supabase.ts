import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new StorageError(
      `Missing ${name} — configure Supabase Storage env vars.`,
    );
  }
  return v;
}

function bucketName() {
  return process.env.SUPABASE_STORAGE_BUCKET ?? "akura-uploads";
}

/** Service-role client for server-side upload/signed URL after app authz. */
function getAdminClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export function resourceObjectKey(tenantId: string, resourceId?: string) {
  return `tenants/${tenantId}/resources/${resourceId ?? randomUUID()}`;
}

export async function putResourceObject(opts: {
  tenantId: string;
  body: Buffer | Uint8Array;
  contentType: string;
  resourceId?: string;
}) {
  const key = resourceObjectKey(opts.tenantId, opts.resourceId);
  const supabase = getAdminClient();
  const bucket = bucketName();

  const { error } = await supabase.storage.from(bucket).upload(key, opts.body, {
    contentType: opts.contentType,
    upsert: false,
  });
  if (error) {
    throw new StorageError(error.message);
  }

  return { key, bucket };
}

export async function signedDownloadUrl(opts: {
  storageKey: string;
  expiresInSeconds?: number;
  filename?: string;
}) {
  const supabase = getAdminClient();
  const bucket = bucketName();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(opts.storageKey, opts.expiresInSeconds ?? 300, {
      download: opts.filename
        ? opts.filename.replace(/"/g, "")
        : undefined,
    });
  if (error || !data?.signedUrl) {
    throw new StorageError(error?.message ?? "Could not create download URL");
  }
  return data.signedUrl;
}

export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
