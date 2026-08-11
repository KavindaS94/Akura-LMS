import {
  boolean,
  integer,
  bigint,
  date,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const membershipRoleEnum = pgEnum("membership_role", [
  "admin",
  "teacher",
  "student",
]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "active",
  "disabled",
]);

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  accentColor: text("accent_color"),
  billingName: text("billing_name"),
  billingAddress: text("billing_address"),
  businessRegNo: text("business_reg_no"),
  taxId: text("tax_id"),
  billingEmail: text("billing_email"),
  billingPhone: text("billing_phone"),
  timezone: text("timezone").notNull().default("Asia/Colombo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    authUserId: text("auth_user_id").notNull(),
    role: membershipRoleEnum("role").notNull(),
    isOwner: boolean("is_owner").notNull().default(false),
    status: membershipStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("memberships_tenant_auth_user_uidx").on(
      table.tenantId,
      table.authUserId,
    ),
  ],
);

export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  actorUserId: text("actor_user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  type: text("type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  email: text("email").notNull(),
  role: membershipRoleEnum("role").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  invitedByAuthUserId: text("invited_by_auth_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const settingDefinitions = pgTable("setting_definitions", {
  key: text("key").primaryKey(),
  capability: text("capability").notNull(),
  type: text("type").notNull(),
  defaultValue: jsonb("default_value").notNull(),
  validation: jsonb("validation").$type<Record<string, unknown>>().notNull().default({}),
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  scope: text("scope").notNull().default("tenant"),
  requiresRole: membershipRoleEnum("requires_role").notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenantSettings = pgTable(
  "tenant_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    key: text("key")
      .notNull()
      .references(() => settingDefinitions.key, { onDelete: "restrict" }),
    value: jsonb("value").notNull(),
    updatedByAuthUserId: text("updated_by_auth_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("tenant_settings_tenant_key_uidx").on(table.tenantId, table.key)],
);

export const settingHistory = pgTable("setting_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  key: text("key").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value").notNull(),
  changedByAuthUserId: text("changed_by_auth_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "free",
  "read_only",
  "dormant",
]);

export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "yearly"]);

export const plans = pgTable("plans", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  prices: jsonb("prices").$type<Record<string, number>>().notNull().default({}),
  limits: jsonb("limits").$type<Record<string, number>>().notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  planKey: text("plan_key")
    .notNull()
    .references(() => plans.key, { onDelete: "restrict" }),
  status: subscriptionStatusEnum("status").notNull().default("trialing"),
  billingCycle: billingCycleEnum("billing_cycle").notNull().default("monthly"),
  currency: text("currency").notNull().default("LKR"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  graceEndsAt: timestamp("grace_ends_at", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  provider: text("provider").notNull().default("none"),
  providerSubscriptionId: text("provider_subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usageCounters = pgTable(
  "usage_counters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    metric: text("metric").notNull(),
    quantity: bigint("quantity", { mode: "number" }).notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("usage_counters_tenant_metric_uidx").on(table.tenantId, table.metric),
  ],
);

export const usageEvents = pgTable("usage_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  metric: text("metric").notNull(),
  delta: bigint("delta", { mode: "number" }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const students = pgTable("students", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  authUserId: text("auth_user_id"),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  dateOfBirth: date("date_of_birth", { mode: "date" }),
  status: text("status").notNull().default("active"),
  customData: jsonb("custom_data").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const guardians = pgTable("guardians", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  relationship: text("relationship").notNull().default("guardian"),
  email: text("email"),
  phone: text("phone"),
  isPrimary: boolean("is_primary").notNull().default(false),
  receivesEmail: boolean("receives_email").notNull().default(true),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  emailStatus: text("email_status").notNull().default("unknown"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const subjects = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  code: text("code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const classes = pgTable("classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  academicYear: text("academic_year"),
  subjectId: uuid("subject_id").references(() => subjects.id, {
    onDelete: "set null",
  }),
  teacherAuthUserId: text("teacher_auth_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const classEnrolments = pgTable(
  "class_enrolments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "restrict" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("class_enrolments_class_student_uidx").on(table.classId, table.studentId),
  ],
);

export const registrationLinks = pgTable("registration_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  token: text("token").notNull().unique(),
  slug: text("slug"),
  label: text("label").notNull().default("Registration"),
  classId: uuid("class_id").references(() => classes.id, { onDelete: "set null" }),
  requiresApproval: boolean("requires_approval").notNull().default(true),
  maxUses: integer("max_uses"),
  useCount: integer("use_count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  collectGuardian: boolean("collect_guardian").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const studentApplications = pgTable("student_applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  registrationLinkId: uuid("registration_link_id").references(
    () => registrationLinks.id,
    { onDelete: "set null" },
  ),
  authUserId: text("auth_user_id"),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  dateOfBirth: date("date_of_birth", { mode: "date" }),
  requestedClassId: uuid("requested_class_id").references(() => classes.id, {
    onDelete: "set null",
  }),
  guardianName: text("guardian_name"),
  guardianEmail: text("guardian_email"),
  guardianPhone: text("guardian_phone"),
  guardianRelationship: text("guardian_relationship"),
  status: text("status").notNull().default("pending"),
  reviewedByAuthUserId: text("reviewed_by_auth_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  src: text("src"),
  ip: text("ip"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const classSessions = pgTable("class_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  classId: uuid("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "restrict" }),
  teacherAuthUserId: text("teacher_auth_user_id").notNull(),
  sessionDate: date("session_date", { mode: "date" }).notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  status: text("status").notNull().default("open"),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => classSessions.id, { onDelete: "restrict" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    status: text("status").notNull(),
    arrivedAt: timestamp("arrived_at", { withTimezone: true }),
    markedAt: timestamp("marked_at", { withTimezone: true }).notNull().defaultNow(),
    markedBy: text("marked_by").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("attendance_session_student_uidx").on(table.sessionId, table.studentId),
  ],
);

export const attendanceEdits = pgTable("attendance_edits", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  attendanceId: uuid("attendance_id")
    .notNull()
    .references(() => attendance.id, { onDelete: "restrict" }),
  previousStatus: text("previous_status").notNull(),
  newStatus: text("new_status").notNull(),
  previousArrivedAt: timestamp("previous_arrived_at", { withTimezone: true }),
  newArrivedAt: timestamp("new_arrived_at", { withTimezone: true }),
  reason: text("reason").notNull(),
  editedBy: text("edited_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exams = pgTable("exams", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  classId: uuid("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  examDate: date("exam_date", { mode: "date" }).notNull(),
  maxMarks: numeric("max_marks", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  publishedBy: text("published_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const marks = pgTable(
  "marks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "restrict" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    score: numeric("score", { precision: 10, scale: 2 }),
    rank: integer("rank"),
    letter: text("letter"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("marks_exam_student_uidx").on(table.examId, table.studentId)],
);

export type Tenant = typeof tenants.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type MembershipRole = (typeof membershipRoleEnum.enumValues)[number];
export type SettingDefinition = typeof settingDefinitions.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type QuotaMetric = "students" | "staff" | "storage_bytes" | "emails";
export type Student = typeof students.$inferSelect;
export type ClassRow = typeof classes.$inferSelect;
export type StudentApplication = typeof studentApplications.$inferSelect;
export type RegistrationLink = typeof registrationLinks.$inferSelect;
export type ClassSession = typeof classSessions.$inferSelect;
export type AttendanceRow = typeof attendance.$inferSelect;
export type AttendanceStatus = "present" | "absent" | "late";
export type Exam = typeof exams.$inferSelect;
export type MarkRow = typeof marks.$inferSelect;
export type ExamStatus = "draft" | "published";

export const courses = pgTable("courses", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  classId: uuid("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const modules = pgTable("modules", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  position: integer("position").notNull().default(0),
  dripEnabled: boolean("drip_enabled").notNull().default(false),
  availableAt: timestamp("available_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const resources = pgTable("resources", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "restrict" }),
  moduleId: uuid("module_id")
    .notNull()
    .references(() => modules.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  type: text("type").notNull(),
  position: integer("position").notNull().default(0),
  body: text("body"),
  externalUrl: text("external_url"),
  storageKey: text("storage_key"),
  mimeType: text("mime_type"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const resourceViews = pgTable(
  "resource_views",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "restrict" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "restrict" }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("resource_views_resource_student_uidx").on(
      table.resourceId,
      table.studentId,
    ),
  ],
);

export type Course = typeof courses.$inferSelect;
export type ModuleRow = typeof modules.$inferSelect;
export type ResourceRow = typeof resources.$inferSelect;
export type ResourceType = "file" | "link" | "text";
export type CourseStatus = "draft" | "published";
