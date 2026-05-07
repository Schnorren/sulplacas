// backend/prisma/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding...');

  // ── PricingConfig (campo "value") ─────────────────────────────────────────
  const pricingEntries = [
    { key: 'BASE_PRICE',           value: 390000, label: 'Preço base (até 18m²)' },
    { key: 'BASE_AREA_LIMIT_M2',   value: 1800,   label: 'Área limite base (m² × 100)' },
    { key: 'EXCESS_PER_M2',        value: 18000,  label: 'Excedente por m² acima do limite' },
    { key: 'INSTALLMENT_12X_RATE', value: 112,    label: 'Taxa 12x (112 = 1.12x)' },
    { key: 'INSTALLMENT_18X_RATE', value: 116,    label: 'Taxa 18x (116 = 1.16x)' },
  ];

  for (const entry of pricingEntries) {
    await prisma.pricingConfig.upsert({
      where:  { key: entry.key },
      update: {},
      create: entry,
    });
  }
  console.log(`✅ ${pricingEntries.length} pricing configs`);

  // ── CityConfig ────────────────────────────────────────────────────────────
  const cities = [
    { name: 'Porto Alegre',         state: 'RS', baseDeslocamento: 0 },
    { name: 'Região Metropolitana', state: 'RS', baseDeslocamento: 15000 },
    { name: 'Interior / Litoral',   state: 'RS', baseDeslocamento: 40000 },
  ];

  for (const city of cities) {
    await prisma.cityConfig.upsert({
      where:  { name: city.name },
      update: {},
      create: city,
    });
  }
  console.log(`✅ ${cities.length} cidades`);

  // ── ExtraProduct ──────────────────────────────────────────────────────────
  const existingExtra = await prisma.extraProduct.count();
  if (existingExtra === 0) {
    await prisma.extraProduct.createMany({
      data: [
        {
          name:        'Capa Térmica',
          description: 'Reduz a perda de calor em até 70%, mantendo a temperatura da piscina por mais tempo.',
          price:       60000,
          icon:        '🌡️',
          isActive:    true,
          sortOrder:   1,
        },
        {
          name:        'Controlador Wi-Fi',
          description: 'Controle a temperatura da sua piscina pelo celular, em qualquer lugar.',
          price:       45000,
          icon:        '📱',
          isActive:    true,
          sortOrder:   2,
        },
      ],
    });
    console.log('✅ 2 extra products');
  } else {
    console.log(`ℹ️  ${existingExtra} extra products já existem`);
  }

  // ── UpsellProduct (usado pelo proposals.service) ──────────────────────────
  const existingUpsell = await prisma.upsellProduct.count();
  if (existingUpsell === 0) {
    await prisma.upsellProduct.createMany({
      data: [
        {
          name:        'Capa Térmica',
          description: 'Reduz a perda de calor em até 70%, mantendo a temperatura da piscina por mais tempo.',
          priceCents:  60000,
          active:      true,
          sortOrder:   1,
        },
        {
          name:        'Controlador Wi-Fi',
          description: 'Controle a temperatura da sua piscina pelo celular, em qualquer lugar.',
          priceCents:  45000,
          active:      true,
          sortOrder:   2,
        },
      ],
    });
    console.log('✅ 2 upsell products');
  } else {
    console.log(`ℹ️  ${existingUpsell} upsell products já existem`);
  }

  console.log('🎉 Seed concluído!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
