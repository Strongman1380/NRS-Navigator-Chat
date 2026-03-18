-- User events for personal dashboard (court dates, appointments, etc.)
CREATE TABLE IF NOT EXISTS user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'court_date', 'probation_checkin', 'mat_appointment', 'ua_date',
    'treatment_session', 'case_manager', 'benefits_review', 'other'
  )),
  event_date timestamptz NOT NULL,
  reminder_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_events_user ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_date ON user_events(event_date);
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own events" ON user_events
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User contacts for personal dashboard (PO, attorney, sponsor, etc.)
CREATE TABLE IF NOT EXISTS user_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_type text NOT NULL CHECK (contact_type IN (
    'probation_officer', 'attorney', 'treatment_provider', 'sponsor',
    'case_manager', 'employer', 'family', 'other'
  )),
  name text NOT NULL,
  phone text,
  email text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_contacts_user ON user_contacts(user_id);
ALTER TABLE user_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own contacts" ON user_contacts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
