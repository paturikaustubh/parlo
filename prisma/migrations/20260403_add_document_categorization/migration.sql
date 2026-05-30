-- Create document_categories table
CREATE TABLE document_categories (
  id BIGSERIAL PRIMARY KEY,
  document_category_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_categories_code ON document_categories(code);

-- Seed data
INSERT INTO document_categories (code, display_name, sort_order) VALUES
  ('aadhar_card', 'Aadhar Card', 1),
  ('pan_card', 'PAN Card', 2),
  ('gst_certificate', 'GST Certificate', 3),
  ('business_license', 'Business License', 4),
  ('business_insurance', 'Business Insurance', 5),
  ('bank_statement', 'Bank Statement', 6),
  ('trade_license', 'Trade License', 7),
  ('proprietorship_deed', 'Proprietorship Deed', 8);

-- Alter business_registrations.document_urls from JSONB array to JSONB object
-- Convert existing array to empty object since we don't preserve categorization for existing data
ALTER TABLE business_registrations
  ALTER COLUMN document_urls TYPE JSONB USING '{}'::jsonb,
  ALTER COLUMN document_urls SET DEFAULT '{}'::jsonb;