-- AlterTable
ALTER TABLE "user_roles" ADD COLUMN "user_role_id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN "business_id" INTEGER,
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "vehicles" (
    "id" SERIAL NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "vehicle_number" VARCHAR(20) NOT NULL,
    "vehicle_type" VARCHAR(20) NOT NULL,
    "nickname" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" SERIAL NOT NULL,
    "business_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spaces" (
    "id" SERIAL NOT NULL,
    "space_id" UUID NOT NULL,
    "business_id" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" SERIAL NOT NULL,
    "pricing_rule_id" UUID NOT NULL,
    "space_id" INTEGER NOT NULL,
    "vehicle_type" VARCHAR(20) NOT NULL,
    "duration_from_minutes" INTEGER NOT NULL,
    "duration_to_minutes" INTEGER,
    "amount_paise" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_members" (
    "id" SERIAL NOT NULL,
    "staff_member_id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "business_id" INTEGER NOT NULL,
    "space_id" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "is_on_duty" BOOLEAN NOT NULL DEFAULT false,
    "duty_started_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_invitations" (
    "id" SERIAL NOT NULL,
    "staff_invitation_id" UUID NOT NULL,
    "business_id" INTEGER NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "space_id" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_requests" (
    "id" SERIAL NOT NULL,
    "staff_request_id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "business_id" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "review_notes" TEXT,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parking_sessions" (
    "id" SERIAL NOT NULL,
    "parking_session_id" UUID NOT NULL,
    "space_id" INTEGER NOT NULL,
    "vehicle_id" INTEGER,
    "vehicle_number" VARCHAR(20) NOT NULL,
    "vehicle_type" VARCHAR(20) NOT NULL,
    "guest_name" VARCHAR(200),
    "guest_phone" VARCHAR(20),
    "token_id" VARCHAR(50),
    "is_on_behalf" BOOLEAN NOT NULL DEFAULT false,
    "user_id" INTEGER,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "checked_in_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked_out_at" TIMESTAMPTZ,
    "duration_minutes" INTEGER,
    "amount_paise" INTEGER,
    "override_amount_paise" INTEGER,
    "override_reason" TEXT,
    "checked_in_by_staff_id" INTEGER,
    "checked_out_by_staff_id" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "parking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_requests" (
    "id" SERIAL NOT NULL,
    "checkout_request_id" UUID NOT NULL,
    "request_code" VARCHAR(6) NOT NULL,
    "space_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "combined_amount_paise" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "approved_by" INTEGER,
    "approved_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "checkout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_request_sessions" (
    "checkout_request_id" INTEGER NOT NULL,
    "parking_session_id" INTEGER NOT NULL,

    CONSTRAINT "checkout_request_sessions_pkey" PRIMARY KEY ("checkout_request_id","parking_session_id")
);

-- CreateTable
CREATE TABLE "business_registrations" (
    "id" SERIAL NOT NULL,
    "business_registration_id" UUID NOT NULL,
    "business_name" VARCHAR(200) NOT NULL,
    "category" VARCHAR(100),
    "space_name" VARCHAR(200) NOT NULL,
    "space_address" TEXT NOT NULL,
    "license_number" VARCHAR(100),
    "gst_number" VARCHAR(20),
    "document_urls" TEXT[],
    "submitted_by" INTEGER,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "review_notes" TEXT,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMPTZ,
    "result_business_id" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "business_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "notification_id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" SERIAL NOT NULL,
    "plan_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "price_monthly_paise" INTEGER,
    "price_yearly_paise" INTEGER,
    "max_spaces" INTEGER,
    "max_staff" INTEGER,
    "analytics_days" INTEGER,
    "features" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_subscriptions" (
    "id" SERIAL NOT NULL,
    "subscription_id" UUID NOT NULL,
    "business_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DEMO',
    "billing_cycle" VARCHAR(20) NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "grace_expires_at" TIMESTAMPTZ,
    "activated_by" INTEGER,
    "activated_at" TIMESTAMPTZ,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "business_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_requests" (
    "id" SERIAL NOT NULL,
    "subscription_request_id" UUID NOT NULL,
    "business_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "requested_by" INTEGER NOT NULL,
    "billing_cycle" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "review_notes" TEXT,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscription_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_entries" (
    "id" SERIAL NOT NULL,
    "audit_id" UUID NOT NULL,
    "business_id" INTEGER NOT NULL,
    "space_id" INTEGER,
    "actor_id" INTEGER NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(50) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vehicle_id_key" ON "vehicles"("vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_user_id_vehicle_number_key" ON "vehicles"("user_id", "vehicle_number");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_business_id_key" ON "businesses"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "spaces_space_id_key" ON "spaces"("space_id");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_rules_pricing_rule_id_key" ON "pricing_rules"("pricing_rule_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_staff_member_id_key" ON "staff_members"("staff_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_user_id_business_id_key" ON "staff_members"("user_id", "business_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_invitations_staff_invitation_id_key" ON "staff_invitations"("staff_invitation_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_requests_staff_request_id_key" ON "staff_requests"("staff_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "parking_sessions_parking_session_id_key" ON "parking_sessions"("parking_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "parking_sessions_token_id_key" ON "parking_sessions"("token_id");

-- CreateIndex
CREATE INDEX "parking_sessions_space_id_status_idx" ON "parking_sessions"("space_id", "status");

-- CreateIndex
CREATE INDEX "parking_sessions_user_id_status_idx" ON "parking_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "parking_sessions_guest_phone_idx" ON "parking_sessions"("guest_phone");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_requests_checkout_request_id_key" ON "checkout_requests"("checkout_request_id");

-- CreateIndex
CREATE INDEX "checkout_requests_space_id_status_idx" ON "checkout_requests"("space_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "business_registrations_business_registration_id_key" ON "business_registrations"("business_registration_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_registrations_result_business_id_key" ON "business_registrations"("result_business_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_notification_id_key" ON "notifications"("notification_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "plans_plan_id_key" ON "plans"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "business_subscriptions_subscription_id_key" ON "business_subscriptions"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_subscriptions_business_id_key" ON "business_subscriptions"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_requests_subscription_request_id_key" ON "subscription_requests"("subscription_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_entries_audit_id_key" ON "audit_entries"("audit_id");

-- CreateIndex
CREATE INDEX "audit_entries_business_id_created_at_idx" ON "audit_entries"("business_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_role_id_key" ON "user_roles"("user_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_business_id_key" ON "user_roles"("user_id", "role_id", "business_id");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_requests" ADD CONSTRAINT "staff_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_requests" ADD CONSTRAINT "staff_requests_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_requests" ADD CONSTRAINT "staff_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_sessions" ADD CONSTRAINT "parking_sessions_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_sessions" ADD CONSTRAINT "parking_sessions_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_sessions" ADD CONSTRAINT "parking_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_sessions" ADD CONSTRAINT "parking_sessions_checked_in_by_staff_id_fkey" FOREIGN KEY ("checked_in_by_staff_id") REFERENCES "staff_members"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parking_sessions" ADD CONSTRAINT "parking_sessions_checked_out_by_staff_id_fkey" FOREIGN KEY ("checked_out_by_staff_id") REFERENCES "staff_members"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_requests" ADD CONSTRAINT "checkout_requests_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_requests" ADD CONSTRAINT "checkout_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_requests" ADD CONSTRAINT "checkout_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "staff_members"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_request_sessions" ADD CONSTRAINT "checkout_request_sessions_checkout_request_id_fkey" FOREIGN KEY ("checkout_request_id") REFERENCES "checkout_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_request_sessions" ADD CONSTRAINT "checkout_request_sessions_parking_session_id_fkey" FOREIGN KEY ("parking_session_id") REFERENCES "parking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_registrations" ADD CONSTRAINT "business_registrations_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_registrations" ADD CONSTRAINT "business_registrations_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_registrations" ADD CONSTRAINT "business_registrations_result_business_id_fkey" FOREIGN KEY ("result_business_id") REFERENCES "businesses"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_id_fkey" FOREIGN KEY ("id") REFERENCES "plans"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscriptions" ADD CONSTRAINT "business_subscriptions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscriptions" ADD CONSTRAINT "business_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_subscriptions" ADD CONSTRAINT "business_subscriptions_activated_by_fkey" FOREIGN KEY ("activated_by") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON UPDATE CASCADE;
