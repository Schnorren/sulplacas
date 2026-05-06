// prisma/seed.ts
// Sul Placas — Seed inicial do banco de dados
// Execução: npx prisma db seed

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco Sul Placas...");

  // ── PricingConfig — constantes editáveis de negócio ────────────────────────
  const configs = [
    { key: "BASE_PRICE",            valueCents: 390_000, description: "Valor base piscinas até 18m² (R$ 3.900,00)" },
    { key: "BASE_AREA_M2",          valueCents: 18,      description: "Área base inclusa em metros quadrados" },
    { key: "EXCESS_M2_PRICE",       valueCents: 18_000,  description: "Preço por m² excedente além dos 18m² base (R$ 180,00)" },
    { key: "DISPLACEMENT_RADIUS_1", valueCents: 0,       description: "Porto Alegre e arredores — sem taxa" },
    { key: "DISPLACEMENT_RADIUS_2", valueCents: 15_000,  description: "Região Metropolitana (R$ 150,00)" },
    { key: "DISPLACEMENT_RADIUS_3", valueCents: 40_000,  description: "Interior / Litoral (R$ 400,00)" },
    { key: "RATE_12X_PERCENT",      valueCents: 12,      description: "Taxa maquininha parcelamento 12x (%)" },
    { key: "RATE_18X_PERCENT",      valueCents: 16,      description: "Taxa maquininha parcelamento 18x (%)" },
    { key: "UPSELL_THERMAL_COVER",  valueCents: 60_000,  description: "Capa Térmica (R$ 600,00)" },
    { key: "UPSELL_WIFI_CTRL",      valueCents: 45_000,  description: "Controlador Wi-Fi (R$ 450,00)" },
    { key: "PROPOSAL_VALIDITY_HOURS", valueCents: 48,    description: "Validade da proposta em horas" },
  ];

  for (const cfg of configs) {
    await prisma.pricingConfig.upsert({
      where:  { key: cfg.key },
      update: { valueCents: cfg.valueCents, description: cfg.description },
      create: cfg,
    });
    console.log(`  ✓ PricingConfig: ${cfg.key} = ${cfg.valueCents}`);
  }

  console.log("✅ Seed concluído!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
