-- Cascade FK rules: full delete hierarchy
-- Business → Spaces → Sessions/CheckoutRequests → cascade
-- Nullable FKs on sessions/requests → SET NULL to preserve history

-- user_roles.business_id: (no action) → CASCADE
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_business_id_fkey;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_business_id_fkey
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

-- staff_members.space_id: (no action) → SET NULL
ALTER TABLE staff_members DROP CONSTRAINT IF EXISTS staff_members_space_id_fkey;
ALTER TABLE staff_members ADD CONSTRAINT staff_members_space_id_fkey
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE SET NULL;

-- staff_requests.reviewed_by: NO ACTION → SET NULL
ALTER TABLE staff_requests DROP CONSTRAINT IF EXISTS staff_requests_reviewed_by_fkey;
ALTER TABLE staff_requests ADD CONSTRAINT staff_requests_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- staff_flags.resolved_by: NO ACTION → SET NULL
ALTER TABLE staff_flags DROP CONSTRAINT IF EXISTS staff_flags_resolved_by_fkey;
ALTER TABLE staff_flags ADD CONSTRAINT staff_flags_resolved_by_fkey
  FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL;

-- parking_sessions.space_id: NO ACTION → CASCADE
ALTER TABLE parking_sessions DROP CONSTRAINT IF EXISTS parking_sessions_space_id_fkey;
ALTER TABLE parking_sessions ADD CONSTRAINT parking_sessions_space_id_fkey
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;

-- parking_sessions.user_id: NO ACTION → SET NULL
ALTER TABLE parking_sessions DROP CONSTRAINT IF EXISTS parking_sessions_user_id_fkey;
ALTER TABLE parking_sessions ADD CONSTRAINT parking_sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- parking_sessions.vehicle_id: NO ACTION → SET NULL
ALTER TABLE parking_sessions DROP CONSTRAINT IF EXISTS parking_sessions_vehicle_id_fkey;
ALTER TABLE parking_sessions ADD CONSTRAINT parking_sessions_vehicle_id_fkey
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;

-- parking_sessions.checked_in_by_staff_id: NO ACTION → SET NULL
ALTER TABLE parking_sessions DROP CONSTRAINT IF EXISTS parking_sessions_checked_in_by_staff_id_fkey;
ALTER TABLE parking_sessions ADD CONSTRAINT parking_sessions_checked_in_by_staff_id_fkey
  FOREIGN KEY (checked_in_by_staff_id) REFERENCES staff_members(id) ON DELETE SET NULL;

-- parking_sessions.checked_out_by_staff_id: NO ACTION → SET NULL
ALTER TABLE parking_sessions DROP CONSTRAINT IF EXISTS parking_sessions_checked_out_by_staff_id_fkey;
ALTER TABLE parking_sessions ADD CONSTRAINT parking_sessions_checked_out_by_staff_id_fkey
  FOREIGN KEY (checked_out_by_staff_id) REFERENCES staff_members(id) ON DELETE SET NULL;

-- parking_sessions.pricing_version_id: NO ACTION → SET NULL
ALTER TABLE parking_sessions DROP CONSTRAINT IF EXISTS parking_sessions_pricing_version_id_fkey;
ALTER TABLE parking_sessions ADD CONSTRAINT parking_sessions_pricing_version_id_fkey
  FOREIGN KEY (pricing_version_id) REFERENCES pricing_formula_versions(id) ON DELETE SET NULL;

-- checkout_requests.space_id: NO ACTION → CASCADE
ALTER TABLE checkout_requests DROP CONSTRAINT IF EXISTS checkout_requests_space_id_fkey;
ALTER TABLE checkout_requests ADD CONSTRAINT checkout_requests_space_id_fkey
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;

-- checkout_requests.user_id: NO ACTION → SET NULL
ALTER TABLE checkout_requests DROP CONSTRAINT IF EXISTS checkout_requests_user_id_fkey;
ALTER TABLE checkout_requests ADD CONSTRAINT checkout_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- checkout_requests.approved_by: NO ACTION → SET NULL
ALTER TABLE checkout_requests DROP CONSTRAINT IF EXISTS checkout_requests_approved_by_fkey;
ALTER TABLE checkout_requests ADD CONSTRAINT checkout_requests_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES staff_members(id) ON DELETE SET NULL;

-- audit_entries.space_id: NO ACTION → SET NULL
ALTER TABLE audit_entries DROP CONSTRAINT IF EXISTS audit_entries_space_id_fkey;
ALTER TABLE audit_entries ADD CONSTRAINT audit_entries_space_id_fkey
  FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE SET NULL;

-- business_registrations.result_business_id: NO ACTION → SET NULL
ALTER TABLE business_registrations DROP CONSTRAINT IF EXISTS business_registrations_result_business_id_fkey;
ALTER TABLE business_registrations ADD CONSTRAINT business_registrations_result_business_id_fkey
  FOREIGN KEY (result_business_id) REFERENCES businesses(id) ON DELETE SET NULL;

-- business_registrations.reviewed_by: NO ACTION → SET NULL
ALTER TABLE business_registrations DROP CONSTRAINT IF EXISTS business_registrations_reviewed_by_fkey;
ALTER TABLE business_registrations ADD CONSTRAINT business_registrations_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- business_registrations.submitted_by: NO ACTION → SET NULL
ALTER TABLE business_registrations DROP CONSTRAINT IF EXISTS business_registrations_submitted_by_fkey;
ALTER TABLE business_registrations ADD CONSTRAINT business_registrations_submitted_by_fkey
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL;
