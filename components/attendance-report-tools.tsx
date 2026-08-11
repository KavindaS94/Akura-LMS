"use client";

export function AttendanceReportTools({
  className,
  eligibilityPct,
  rows,
}: {
  className: string;
  eligibilityPct: number;
  rows: {
    name: string;
    present: number;
    absent: number;
    late: number;
    percentage: number;
    longestAbsenceStreak: number;
    eligible: boolean;
  }[];
}) {
  function downloadCsv() {
    const header = [
      "Student",
      "Present",
      "Absent",
      "Late",
      "Attendance %",
      "Longest absence streak",
      `Eligible (>=${eligibilityPct}%)`,
    ];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          csvEscape(r.name),
          r.present,
          r.absent,
          r.late,
          r.percentage,
          r.longestAbsenceStreak,
          r.eligible ? "yes" : "no",
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${className.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button
        type="button"
        onClick={downloadCsv}
        className="rounded-md border border-ink/20 px-3 py-2 text-sm"
      >
        Download CSV
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-md bg-ink px-3 py-2 text-sm text-surface"
      >
        Print / PDF
      </button>
    </div>
  );
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
