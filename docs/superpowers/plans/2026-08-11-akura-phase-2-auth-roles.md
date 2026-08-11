# Akura Phase 2 — Auth & roles

**Complete when:** Teacher gets 403 on admin routes; tenant never reaches zero owners.

- [x] `invitations` + RLS + signup/accept SECURITY DEFINER helpers
- [x] Signup creates tenant + owner admin
- [x] Invites for admin/teacher/student
- [x] `requireRole` / `assertRole` on `/i/[slug]/admin|teacher|student`
- [x] Onboarding wizard (timezone + accent)
- [x] Ownership transfer; cannot disable last owner
- [x] Tests in `tests/roles-ownership.test.ts`
