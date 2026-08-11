import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { csvEscape, toCsv } from "../lib/export/csv";
import { EXPORT_DATASETS } from "../lib/export/tenant-csv";

describe("csv export helpers", () => {
  it("escapes commas and quotes", () => {
    assert.equal(csvEscape("a,b"), '"a,b"');
    assert.equal(csvEscape('say "hi"'), '"say ""hi"""');
    assert.equal(csvEscape(null), "");
  });

  it("builds csv with trailing newline", () => {
    const out = toCsv(["a", "b"], [["1", "2"], ["x,y", "z"]]);
    assert.equal(out, 'a,b\n1,2\n"x,y",z\n');
  });

  it("lists expected datasets", () => {
    assert.deepEqual(EXPORT_DATASETS, [
      "students",
      "guardians",
      "attendance",
      "marks",
    ]);
  });
});
