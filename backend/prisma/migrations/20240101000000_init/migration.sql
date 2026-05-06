-- CreateEnum
CREATE TYPE "Region" AS ENUM ('PORTO_ALEGRE', 'REGIAO_METRO', 'INTERIOR_LITORAL');
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'APPROVED', 'EXPIRED', 'LOST');
CREATE TYPE "FollowupType" AS ENUM ('VIEWED_NOT_APPROVED', 'NEVER_OPENED_24H', 'NEVER_OPENED_72H', 'MANUAL');

CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "city" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "clients_whatsapp_key" ON "clients"("whatsapp");

CREATE TABLE "proposals" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "length_m" DOUBLE PRECISION NOT NULL,
    "width_m" DOUBLE PRECISION NOT NULL,
    "area_m2" DOUBLE PRECISION NOT NULL,
    "region" "Region" NOT NULL,
    "city" TEXT,
    "base_value_cents" INTEGER NOT NULL,
    "excess_area_value_cents" INTEGER NOT NULL,
    "displacement_value_cents" INTEGER NOT NULL,
    "total_cash_cents" INTEGER NOT NULL,
    "total_12x_gross_cents" INTEGER NOT NULL,
    "installment_12x_cents" INTEGER NOT NULL,
    "total_18x_gross_cents" INTEGER NOT NULL,
    "installment_18x_cents" INTEGER NOT NULL,
    "thermal_cover_price_cents" INTEGER NOT NULL DEFAULT 60000,
    "wifi_controller_price_cents" INTEGER NOT NULL DEFAULT 30000,
    "selected_thermal_cover" BOOLEAN NOT NULL DEFAULT false,
    "selected_wifi_controller" BOOLEAN NOT NULL DEFAULT false,
    "roi_days_without" INTEGER NOT NULL DEFAULT 90,
    "roi_days_with" INTEGER NOT NULL DEFAULT 270,
    "roi_extra_days" INTEGER NOT NULL DEFAULT 180,
    "roi_daily_cost_cents" INTEGER NOT NULL DEFAULT 0,
    "roi_months" INTEGER NOT NULL DEFAULT 0,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "last_viewed_at" TIMESTAMP(3),
    "followup_sent_at" TIMESTAMP(3),
    "followup_wa_link" TEXT,
    "followup_type" "FollowupType",
    "hot_alert_sent_at" TIMESTAMP(3),
    "approval_message_link" TEXT,
    "signed_at" TIMESTAMP(3),
    "signature_name" TEXT,
    "signature_ip" TEXT,
    "signature_device" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "installation_photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "proposals_client_id_idx" ON "proposals"("client_id");
CREATE INDEX "proposals_status_idx" ON "proposals"("status");
CREATE INDEX "proposals_expires_at_idx" ON "proposals"("expires_at");
CREATE INDEX "proposals_followup_sent_at_idx" ON "proposals"("followup_sent_at");

ALTER TABLE "proposals" ADD CONSTRAINT "proposals_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "pricing_configs" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value_cents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pricing_configs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pricing_configs_key_key" ON "pricing_configs"("key");
