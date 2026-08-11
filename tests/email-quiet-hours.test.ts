import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isInQuietHours, parseHhMm } from "../lib/email/quiet-hours";
import { groupGuardiansByEmail } from "../capabilities/notifications/lib/handlers";

describe("quiet hours", () => {
  it("parses HH:MM", () => {
    assert.deepEqual(parseHhMm("21:00"), { hours: 21, minutes: 0 });
    assert.equal(parseHhMm("25:00"), null);
  });

  it("treats overnight 21:00–07:00 as quiet at 22:00 Colombo", () => {
    // 2026-08-11 22:30 Asia/Colombo = 17:00 UTC
    const when = new Date("2026-08-11T17:00:00.000Z");
    assert.equal(
      isInQuietHours(when, "21:00", "07:00", "Asia/Colombo"),
      true,
    );
  });

  it("is not quiet at midday Colombo for overnight window", () => {
    // 2026-08-12 12:00 Asia/Colombo = 06:30 UTC
    const when = new Date("2026-08-12T06:30:00.000Z");
    assert.equal(
      isInQuietHours(when, "21:00", "07:00", "Asia/Colombo"),
      false,
    );
  });

  it("handles same-day window", () => {
    const when = new Date("2026-08-12T01:00:00.000Z"); // 06:30 Colombo
    assert.equal(
      isInQuietHours(when, "06:00", "08:00", "Asia/Colombo"),
      true,
    );
  });
});

describe("absence email batching", () => {
  it("groups multiple students under one guardian email", () => {
    const batches = groupGuardiansByEmail([
      {
        email: "parent@example.com",
        guardianName: "Parent",
        studentId: "s1",
        studentName: "Asha",
        receivesEmail: true,
        emailStatus: "ok",
      },
      {
        email: "parent@example.com",
        guardianName: "Parent",
        studentId: "s2",
        studentName: "Bin",
        receivesEmail: true,
        emailStatus: "ok",
      },
      {
        email: "other@example.com",
        guardianName: "Other",
        studentId: "s3",
        studentName: "C",
        receivesEmail: true,
        emailStatus: "ok",
      },
      {
        email: "bounce@example.com",
        guardianName: "X",
        studentId: "s4",
        studentName: "D",
        receivesEmail: true,
        emailStatus: "bounced",
      },
    ]);
    assert.equal(batches.length, 2);
    const parent = batches.find((b) => b.email === "parent@example.com");
    assert.ok(parent);
    assert.deepEqual(parent!.studentNames.sort(), ["Asha", "Bin"]);
  });
});
