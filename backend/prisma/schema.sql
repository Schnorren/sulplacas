-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'APPROVED', 'EXPIRED', 'NEGOTIATING', 'LOST');

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" TEXT NOT NULL,
    "proposal_code" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "length_m" DOUBLE PRECISION NOT NULL,
    "width_m" DOUBLE PRECISION NOT NULL,
    "area_m2" DOUBLE PRECISION NOT NULL,
    "client_city" TEXT NOT NULL DEFAULT 'Porto Alegre',
    "displacement_cost_cents" INTEGER NOT NULL DEFAULT 0,
    "hidden_margin_cents" INTEGER NOT NULL DEFAULT 0,
    "base_price_cents" INTEGER NOT NULL,
    "excess_price_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cash_cents" INTEGER NOT NULL,
    "selected_upsell_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "upsell_total_cents" INTEGER NOT NULL DEFAULT 0,
    "validity_days" INTEGER NOT NULL DEFAULT 7,
    "expires_at" TIMESTAMP(3),
    "internal_notes" TEXT,
    "followup_sent_at" TIMESTAMP(3),
    "followup_wa_link" TEXT,
    "followup_type" TEXT,
    "hot_alert_sent_at" TIMESTAMP(3),
    "last_contacted_at" TIMESTAMP(3),
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "last_viewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_views" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,
    "ip" TEXT,

    CONSTRAINT "proposal_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_events" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extra_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extra_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "city_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'RS',
    "base_deslocamento" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "city_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upsell_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price_cents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upsell_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_counter" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "proposal_counter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_whatsapp_key" ON "clients"("whatsapp");

-- CreateIndex
CREATE UNIQUE INDEX "proposals_proposal_code_key" ON "proposals"("proposal_code");

-- CreateIndex
CREATE INDEX "proposals_status_idx" ON "proposals"("status");

-- CreateIndex
CREATE INDEX "proposals_created_at_idx" ON "proposals"("created_at");

-- CreateIndex
CREATE INDEX "proposals_client_id_idx" ON "proposals"("client_id");

-- CreateIndex
CREATE INDEX "proposals_status_last_viewed_at_idx" ON "proposals"("status", "last_viewed_at");

-- CreateIndex
CREATE INDEX "proposal_views_proposal_id_idx" ON "proposal_views"("proposal_id");

-- CreateIndex
CREATE INDEX "proposal_events_proposal_id_idx" ON "proposal_events"("proposal_id");

-- CreateIndex
CREATE UNIQUE INDEX "city_configs_name_key" ON "city_configs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_config_key_key" ON "pricing_config"("key");

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_views" ADD CONSTRAINT "proposal_views_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_events" ADD CONSTRAINT "proposal_events_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

