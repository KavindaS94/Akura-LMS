"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ResourceUpload({
  slug,
  moduleId,
}: {
  slug: string;
  moduleId: string;
}) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="mt-3 space-y-2 border-t border-ink/10 pt-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">File upload</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="File title"
        className="w-full rounded-md border border-ink/15 px-3 py-2 text-sm"
      />
      <input
        type="file"
        disabled={pending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setError(null);
          start(async () => {
            const body = new FormData();
            body.set("slug", slug);
            body.set("moduleId", moduleId);
            body.set("title", title.trim() || file.name);
            body.set("file", file);
            const res = await fetch("/api/uploads", { method: "POST", body });
            const data = (await res.json()) as { error?: string };
            if (!res.ok) {
              setError(data.error ?? "Upload failed");
              return;
            }
            setTitle("");
            router.refresh();
          });
        }}
        className="block w-full text-sm"
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {pending ? <p className="text-xs text-muted">Uploading…</p> : null}
    </div>
  );
}
