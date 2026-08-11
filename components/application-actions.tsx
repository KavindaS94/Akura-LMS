"use client";

import { useTransition } from "react";
import {
  approveApplicationAction,
  rejectApplicationAction,
} from "@/capabilities/students/lib/actions";

export function ApplicationActions({
  slug,
  applicationId,
}: {
  slug: string;
  applicationId: string;
}) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        className="rounded-md bg-success px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
        onClick={() =>
          start(async () => {
            const res = await approveApplicationAction(slug, applicationId);
            if (res?.error) alert(res.error);
            else window.location.reload();
          })
        }
      >
        Approve
      </button>
      <button
        type="button"
        disabled={pending}
        className="rounded-md border border-danger px-3 py-1.5 text-xs text-danger disabled:opacity-60"
        onClick={() =>
          start(async () => {
            await rejectApplicationAction(slug, applicationId);
            window.location.reload();
          })
        }
      >
        Reject
      </button>
    </div>
  );
}
