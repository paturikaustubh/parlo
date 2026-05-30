-- Rename category to space_type in business_registrations
ALTER TABLE "business_registrations" RENAME COLUMN "category" TO "space_type";

-- Add space_type column to spaces
ALTER TABLE "spaces" ADD COLUMN "space_type" VARCHAR(100);
