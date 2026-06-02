-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add_query_indexes
-- Drops 3 redundant indexes (covered by unique constraints or broader compounds)
-- Adds 19 missing indexes identified from query pattern analysis
-- All statements use IF EXISTS / IF NOT EXISTS — safe to run on any state
-- ─────────────────────────────────────────────────────────────────────────────

-- ── DROP redundant indexes ────────────────────────────────────────────────────

-- Redundant: auth_sessions_token_hash_key (unique) already serves as index
DROP INDEX IF EXISTS auth_sessions_token_hash_idx;

-- Redundant: auth_sessions_user_id_revoked_at_idx compound covers (user_id) prefix
DROP INDEX IF EXISTS auth_sessions_user_id_idx;

-- Redundant: document_categories_code_key (unique) already serves as index
DROP INDEX IF EXISTS idx_document_categories_code;

-- ── CREATE missing indexes ────────────────────────────────────────────────────

-- businesses: every owner API resolves business via owner_id (hottest path)
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id_deleted_at
    ON businesses (owner_id, deleted_at);

-- spaces: every spaces list, analytics, pricing, session queries filter by business
CREATE INDEX IF NOT EXISTS idx_spaces_business_id
    ON spaces (business_id);

-- pricing_rules: pricing lookup on every check-in (space + active rules)
CREATE INDEX IF NOT EXISTS idx_pricing_rules_space_id_is_active
    ON pricing_rules (space_id, is_active);

-- pricing_formula_versions: FK lookup for current pricing version per space
CREATE INDEX IF NOT EXISTS idx_pricing_formula_versions_space_id
    ON pricing_formula_versions (space_id);

-- staff_members: staff management, analytics, subscription limit checks
CREATE INDEX IF NOT EXISTS idx_staff_members_business_id
    ON staff_members (business_id);

-- staff_members: auth flows, duty tracking, every staff-facing API
CREATE INDEX IF NOT EXISTS idx_staff_members_user_id_status
    ON staff_members (user_id, status);

-- staff_members: staff-by-space queries (QR panel, operate page)
CREATE INDEX IF NOT EXISTS idx_staff_members_space_id
    ON staff_members (space_id);

-- user_roles: role resolution on login / requireRole middleware
CREATE INDEX IF NOT EXISTS idx_user_roles_business_id
    ON user_roles (business_id);

-- vehicles: vehicle list + check-in vehicle lookup
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id_is_active
    ON vehicles (user_id, is_active);

-- parking_sessions: analytics groupBy for staff performance
CREATE INDEX IF NOT EXISTS idx_parking_sessions_checked_in_by_staff_id
    ON parking_sessions (checked_in_by_staff_id);

CREATE INDEX IF NOT EXISTS idx_parking_sessions_checked_out_by_staff_id
    ON parking_sessions (checked_out_by_staff_id);

-- parking_sessions: vehicle session history
CREATE INDEX IF NOT EXISTS idx_parking_sessions_vehicle_id
    ON parking_sessions (vehicle_id);

-- staff_requests: pending request queries for owner dashboard
CREATE INDEX IF NOT EXISTS idx_staff_requests_business_id_status
    ON staff_requests (business_id, status);

-- staff_invitations: invitation management and phone-based lookup at onboarding
CREATE INDEX IF NOT EXISTS idx_staff_invitations_business_id
    ON staff_invitations (business_id);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_phone
    ON staff_invitations (phone);

-- subscription_requests: subscription management page filters
CREATE INDEX IF NOT EXISTS idx_subscription_requests_business_id_status
    ON subscription_requests (business_id, status);

-- business_registrations: verifier dashboard (status filter) + owner lookup
CREATE INDEX IF NOT EXISTS idx_business_registrations_status
    ON business_registrations (status);

CREATE INDEX IF NOT EXISTS idx_business_registrations_submitted_by_status
    ON business_registrations (submitted_by, status);

-- checkout_requests: user checkout history
CREATE INDEX IF NOT EXISTS idx_checkout_requests_user_id
    ON checkout_requests (user_id);
