-- Phase 5: attendance sessions

CREATE TABLE IF NOT EXISTS class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  teacher_auth_user_id text NOT NULL,
  session_date date NOT NULL,
  start_time text,
  end_time text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'locked')),
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- COALESCE so NULL start_time still enforces one session per class/day
CREATE UNIQUE INDEX IF NOT EXISTS class_sessions_unique_slot
  ON class_sessions (tenant_id, class_id, session_date, (COALESCE(start_time, '')))
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  session_id uuid NOT NULL REFERENCES class_sessions(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  arrived_at timestamptz,
  marked_at timestamptz NOT NULL DEFAULT now(),
  marked_by text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);

CREATE TABLE IF NOT EXISTS attendance_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  attendance_id uuid NOT NULL REFERENCES attendance(id) ON DELETE RESTRICT,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  previous_arrived_at timestamptz,
  new_arrived_at timestamptz,
  reason text NOT NULL,
  edited_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS class_sessions_class_date_idx
  ON class_sessions (tenant_id, class_id, session_date);
CREATE INDEX IF NOT EXISTS attendance_session_id_idx ON attendance (session_id);
CREATE INDEX IF NOT EXISTS attendance_student_id_idx ON attendance (student_id);
CREATE INDEX IF NOT EXISTS attendance_edits_attendance_id_idx ON attendance_edits (attendance_id);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['class_sessions', 'attendance', 'attendance_edits']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (tenant_id = NULLIF(current_setting(''app.current_tenant'', true), '''')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting(''app.current_tenant'', true), '''')::uuid)',
      t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO akura_app', t);
  END LOOP;
END $$;
