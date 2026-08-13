"use client";

import { useTransition } from "react";
import {
  approveApplicationAction,
  rejectApplicationAction,
} from "@/capabilities/students/lib/actions";
import { Button } from "@/components/ui/button";

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
      <Button
        type="button"
        size="sm"
        disabled={pending}
        className="bg-success hover:bg-success/90 focus-visible:outline-success"
        onClick={() =>
          start(async () => {
            const res = await approveApplicationAction(slug, applicationId);
            if (res?.error) alert(res.error);
            else window.location.reload();
          })
        }
      >
        Approve
      </Button>
      <Button
        type="button"
        size="sm"
        variant="danger"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await rejectApplicationAction(slug, applicationId);
            window.location.reload();
          })
        }
      >
        Reject
      </Button>
    </div>
  );
}
