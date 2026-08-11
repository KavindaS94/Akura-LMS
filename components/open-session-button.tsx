"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { openTodaySessionAction } from "@/capabilities/attendance/lib/actions";

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
    <button
      type="button"
      disabled={pending}
      className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
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
    </button>
  );
}
