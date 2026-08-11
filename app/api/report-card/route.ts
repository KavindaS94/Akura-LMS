import { NextResponse } from "next/server";
import React from "react";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { getTenantContext } from "@/lib/tenant/context";
import { ForbiddenError } from "@/lib/rbac";
import { TenantError } from "@/lib/tenant/resolve";
import {
  attendancePercentForStudent,
  getReportCardData,
} from "@/capabilities/exams/lib/service";
import { ReportCardDocument } from "@/capabilities/exams/lib/report-card";

export const runtime = "nodejs";

const querySchema = z.object({
  slug: z.string().min(1),
  examId: z.string().uuid(),
  studentId: z.string().uuid(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    slug: url.searchParams.get("slug"),
    examId: url.searchParams.get("examId"),
    studentId: url.searchParams.get("studentId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  try {
    const ctx = await getTenantContext(parsed.data.slug);

    // Students may only download their own card
    if (ctx.membership.role === "student") {
      const { findStudentIdForAuthUser } = await import(
        "@/capabilities/exams/lib/service"
      );
      const me = await findStudentIdForAuthUser({
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        authUserId: ctx.user.id,
      });
      if (!me || me.id !== parsed.data.studentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (
      ctx.membership.role !== "admin" &&
      ctx.membership.role !== "teacher"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await getReportCardData({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
      examId: parsed.data.examId,
      studentId: parsed.data.studentId,
    });

    let attendancePercent: number | null = null;
    if (data.includeAttendance) {
      attendancePercent = await attendancePercentForStudent({
        tenantId: ctx.tenantId,
        userId: ctx.user.id,
        classId: data.classId,
        studentId: parsed.data.studentId,
      });
    }

    const buffer = await renderToBuffer(
      React.createElement(ReportCardDocument, {
        instituteName: ctx.tenant.name,
        studentName: data.student.fullName,
        className: data.className,
        examTitle: data.exam.title,
        examDate: data.exam.examDate.toISOString().slice(0, 10),
        score: data.score,
        maxMarks: data.maxMarks,
        percentage: data.percentage,
        letter: data.letter,
        rank: data.rank,
        attendancePercent,
      }) as Parameters<typeof renderToBuffer>[0],
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-card-${parsed.data.examId.slice(0, 8)}.pdf"`,
      },
    });
  } catch (err) {
    if (err instanceof TenantError && err.code === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    if (err instanceof ForbiddenError || err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
