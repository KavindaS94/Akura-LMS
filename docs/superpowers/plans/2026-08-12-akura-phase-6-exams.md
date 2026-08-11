# Akura Phase 6 — Exams & marks

- [x] exams + marks + RLS (`0007_exams.sql`)
- [x] Numeric entry grid; draft save; admin-only publish
- [x] Stored competition ranks + built-in letter scale at publish
- [x] Student results: published only; rank gated by `exams.class_rank_visible`
- [x] React-PDF report card (`/api/report-card`); optional attendance %
- [x] `exams.published` outbox; `assertWritable` on create/save/publish
- [x] `tests/exams-publish.test.ts`
