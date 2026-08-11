import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  classSessions,
  classes,
  exams,
  guardians,
  marks,
  students,
  tenants,
} from "@/lib/db/schema";
import { type Tx } from "@/lib/db/tenant";
import { assertQuota, recordUsage, QuotaError } from "@/lib/billing/quota";
import { sendEmail, isResendConfigured, EmailError } from "@/lib/email/client";
import { AbsenceEmail } from "@/emails/absence";
import { ResultsEmail } from "@/emails/results";
import { settingDefinitions, tenantSettings } from "@/lib/db/schema";

async function readSetting<T>(
  tx: Tx,
  tenantId: string,
  key: string,
): Promise<T> {
  const def = await tx
    .select()
    .from(settingDefinitions)
    .where(eq(settingDefinitions.key, key))
    .limit(1);
  if (!def[0]) throw new Error(`Unknown setting: ${key}`);
  const override = await tx
    .select()
    .from(tenantSettings)
    .where(
      and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.key, key)),
    )
    .limit(1);
  return (override[0]?.value ?? def[0].defaultValue) as T;
}

export type GuardianRecipient = {
  email: string;
  guardianName: string;
  studentIds: string[];
  studentNames: string[];
};

/** Group guardians by email for batched absence notices. */
export function groupGuardiansByEmail(
  rows: {
    email: string | null;
    guardianName: string;
    studentId: string;
    studentName: string;
    receivesEmail: boolean;
    emailStatus: string;
  }[],
): GuardianRecipient[] {
  const map = new Map<string, GuardianRecipient>();
  for (const row of rows) {
    if (!row.email || !row.receivesEmail) continue;
    if (row.emailStatus === "bounced") continue;
    const key = row.email.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      if (!existing.studentIds.includes(row.studentId)) {
        existing.studentIds.push(row.studentId);
        existing.studentNames.push(row.studentName);
      }
    } else {
      map.set(key, {
        email: row.email,
        guardianName: row.guardianName,
        studentIds: [row.studentId],
        studentNames: [row.studentName],
      });
    }
  }
  return [...map.values()];
}

export async function handleAttendanceMarked(
  tx: Tx,
  opts: {
    tenantId: string;
    userId: string;
    payload: Record<string, unknown>;
    dryRun?: boolean;
  },
): Promise<{ sent: number; deferredReason?: string }> {
  const enabled = await readSetting<boolean>(
    tx,
    opts.tenantId,
    "notifications.absence_email_enabled",
  );
  if (!enabled) return { sent: 0, deferredReason: "disabled" };

  const absentIds = Array.isArray(opts.payload.absentStudentIds)
    ? (opts.payload.absentStudentIds as string[])
    : [];
  if (absentIds.length === 0) return { sent: 0 };

  const sessionId = String(opts.payload.sessionId ?? "");
  const [session] = sessionId
    ? await tx
        .select()
        .from(classSessions)
        .where(
          and(
            eq(classSessions.id, sessionId),
            eq(classSessions.tenantId, opts.tenantId),
          ),
        )
        .limit(1)
    : [];

  const [klass] = session
    ? await tx
        .select()
        .from(classes)
        .where(eq(classes.id, session.classId))
        .limit(1)
    : [];

  const [tenant] = await tx
    .select()
    .from(tenants)
    .where(eq(tenants.id, opts.tenantId))
    .limit(1);

  const studentRows = await tx
    .select({
      id: students.id,
      fullName: students.fullName,
    })
    .from(students)
    .where(
      and(
        eq(students.tenantId, opts.tenantId),
        inArray(students.id, absentIds),
        isNull(students.deletedAt),
      ),
    );

  const nameById = new Map(studentRows.map((s) => [s.id, s.fullName]));

  const guardianRows = await tx
    .select({
      email: guardians.email,
      guardianName: guardians.name,
      studentId: guardians.studentId,
      receivesEmail: guardians.receivesEmail,
      emailStatus: guardians.emailStatus,
    })
    .from(guardians)
    .where(
      and(
        eq(guardians.tenantId, opts.tenantId),
        inArray(guardians.studentId, absentIds),
        isNull(guardians.deletedAt),
      ),
    );

  const batches = groupGuardiansByEmail(
    guardianRows.map((g) => ({
      ...g,
      studentName: nameById.get(g.studentId) ?? "Student",
    })),
  );

  if (batches.length === 0) return { sent: 0 };

  if (!opts.dryRun && !isResendConfigured()) {
    return { sent: 0, deferredReason: "resend_not_configured" };
  }

  try {
    await assertQuota(
      opts.tenantId,
      opts.userId,
      "emails",
      batches.length,
      tx,
    );
  } catch (err) {
    if (err instanceof QuotaError) {
      throw err;
    }
    throw err;
  }

  const sessionDateLabel = session?.sessionDate
    ? new Date(session.sessionDate).toLocaleDateString("en-GB", {
        timeZone: tenant?.timezone ?? "Asia/Colombo",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "today";

  let sent = 0;
  for (const batch of batches) {
    if (!opts.dryRun) {
      await sendEmail({
        to: batch.email,
        subject: `Absence notice — ${tenant?.name ?? "Institute"}`,
        react: AbsenceEmail({
          instituteName: tenant?.name ?? "Institute",
          guardianName: batch.guardianName,
          studentNames: batch.studentNames,
          className: klass?.name,
          sessionDateLabel,
        }),
        idempotencyKey: `absence:${opts.tenantId}:${sessionId}:${batch.email}`,
      });
    }
    sent += 1;
  }

  if (!opts.dryRun && sent > 0) {
    await recordUsage(tx, {
      tenantId: opts.tenantId,
      metric: "emails",
      delta: sent,
      reason: "attendance.absence",
    });
  }

  return { sent };
}

export async function handleExamsPublished(
  tx: Tx,
  opts: {
    tenantId: string;
    userId: string;
    payload: Record<string, unknown>;
    dryRun?: boolean;
  },
): Promise<{ sent: number; deferredReason?: string }> {
  const enabled = await readSetting<boolean>(
    tx,
    opts.tenantId,
    "notifications.results_email_enabled",
  );
  if (!enabled) return { sent: 0, deferredReason: "disabled" };

  const examId = String(opts.payload.examId ?? "");
  if (!examId) return { sent: 0 };

  const [exam] = await tx
    .select()
    .from(exams)
    .where(and(eq(exams.id, examId), eq(exams.tenantId, opts.tenantId)))
    .limit(1);
  if (!exam || exam.status !== "published") return { sent: 0 };

  const [tenant] = await tx
    .select()
    .from(tenants)
    .where(eq(tenants.id, opts.tenantId))
    .limit(1);

  const markRows = await tx
    .select({
      studentId: marks.studentId,
      score: marks.score,
      letter: marks.letter,
      studentName: students.fullName,
    })
    .from(marks)
    .innerJoin(students, eq(marks.studentId, students.id))
    .where(
      and(eq(marks.examId, examId), eq(marks.tenantId, opts.tenantId)),
    );

  if (markRows.length === 0) return { sent: 0 };

  const studentIds = markRows.map((m) => m.studentId);
  const guardianRows = await tx
    .select()
    .from(guardians)
    .where(
      and(
        eq(guardians.tenantId, opts.tenantId),
        inArray(guardians.studentId, studentIds),
        isNull(guardians.deletedAt),
      ),
    );

  type Job = {
    email: string;
    guardianName: string;
    studentName: string;
    scoreLabel: string;
    studentId: string;
  };
  const jobs: Job[] = [];
  for (const g of guardianRows) {
    if (!g.email || !g.receivesEmail || g.emailStatus === "bounced") continue;
    const mark = markRows.find((m) => m.studentId === g.studentId);
    if (!mark) continue;
    const scoreLabel =
      mark.letter != null
        ? `${mark.score} (${mark.letter})`
        : String(mark.score);
    jobs.push({
      email: g.email,
      guardianName: g.name,
      studentName: mark.studentName,
      scoreLabel,
      studentId: g.studentId,
    });
  }

  // Dedupe identical guardian+student pairs
  const seen = new Set<string>();
  const unique = jobs.filter((j) => {
    const k = `${j.email.toLowerCase()}:${j.studentId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (unique.length === 0) return { sent: 0 };

  if (!opts.dryRun && !isResendConfigured()) {
    return { sent: 0, deferredReason: "resend_not_configured" };
  }

  await assertQuota(opts.tenantId, opts.userId, "emails", unique.length, tx);

  let sent = 0;
  for (const job of unique) {
    if (!opts.dryRun) {
      await sendEmail({
        to: job.email,
        subject: `Results — ${exam.title}`,
        react: ResultsEmail({
          instituteName: tenant?.name ?? "Institute",
          guardianName: job.guardianName,
          studentName: job.studentName,
          examTitle: exam.title,
          scoreLabel: job.scoreLabel,
        }),
        idempotencyKey: `results:${examId}:${job.studentId}:${job.email.toLowerCase()}`,
      });
    }
    sent += 1;
  }

  if (!opts.dryRun && sent > 0) {
    await recordUsage(tx, {
      tenantId: opts.tenantId,
      metric: "emails",
      delta: sent,
      reason: "exams.results",
    });
  }

  return { sent };
}

export { EmailError, QuotaError };
