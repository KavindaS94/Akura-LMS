"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { openTodaySessionAction } from "@/capabilities/attendance/lib/actions";
import { Button } from "@/components/ui/button";

export function OpenSessionButton({
  slug,
  classId,
}: {
  slug: string;
  classId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await openTodaySessionAction(slug, classId);
          if (res?.sessionId) {
            router.push(`/i/${slug}/teacher/attendance/${res.sessionId}`);
          } else if (res?.error) {
            alert(res.error);
          }
        })
      }
    >
      {pending ? "Opening…" : "Mark today"}
    </Button>
  );
}
