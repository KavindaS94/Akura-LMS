import type { MembershipRole } from "@/lib/db/schema";

export class ForbiddenError extends Error {
  readonly status = 403 as const;
  constructor(message = "You do not have permission to access this area.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function roleHomePath(
  slug: string,
  role: MembershipRole,
): string {
  switch (role) {
    case "admin":
      return `/i/${slug}/admin`;
    case "teacher":
      return `/i/${slug}/teacher`;
    case "student":
      return `/i/${slug}/student`;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export function assertRole(
  actual: MembershipRole,
  allowed: MembershipRole[],
): void {
  if (!allowed.includes(actual)) {
    throw new ForbiddenError();
  }
}

/** Admin-only surface (billing rights still gated by isOwner separately). */
export const ADMIN_ROLES: MembershipRole[] = ["admin"];

/** Teacher workspace — admins may also enter. */
export const TEACHER_ROLES: MembershipRole[] = ["admin", "teacher"];

/** Student workspace — students only. */
export const STUDENT_ROLES: MembershipRole[] = ["student"];
