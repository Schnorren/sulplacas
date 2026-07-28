// backend/prisma/import-backup.ts
// Importa o backup (backups/clients.json + backups/proposals.json) para o banco
// apontado por DATABASE_URL. Idempotente: rode quantas vezes quiser.
//
// Uso (depois de criar as tabelas com schema.sql e rodar o seed):
//   cd backend && npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/import-backup.ts

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const dir = path.join(__dirname, '..', '..', 'backups');

const d = (v: any) => (v ? new Date(v) : null);

async function main() {
  const clients = JSON.parse(fs.readFileSync(path.join(dir, 'clients.json'), 'utf8'));
  const proposals = JSON.parse(fs.readFileSync(path.join(dir, 'proposals.json'), 'utf8'));

  // 1. Clientes
  for (const c of clients) {
    await prisma.client.upsert({
      where: { id: c.id },
      update: { name: c.name, whatsapp: c.whatsapp, email: c.email ?? null },
      create: {
        id: c.id, name: c.name, whatsapp: c.whatsapp,
        email: c.email ?? null, createdAt: d(c.createdAt)!,
      },
    });
  }
  console.log(`✓ Clientes importados: ${clients.length}`);

  // 2. Propostas
  let maxSeq = 0;
  for (const p of proposals) {
    const data = {
      proposalCode: p.proposalCode, clientId: p.clientId,
      lengthM: p.lengthM, widthM: p.widthM, areaM2: p.areaM2,
      clientCity: p.clientCity, displacementCostCents: p.displacementCostCents,
      hiddenMarginCents: p.hiddenMarginCents, basePriceCents: p.basePriceCents,
      excessPriceCents: p.excessPriceCents, totalCashCents: p.totalCashCents,
      selectedUpsellIds: p.selectedUpsellIds ?? [], upsellTotalCents: p.upsellTotalCents,
      validityDays: p.validityDays, expiresAt: d(p.expiresAt),
      internalNotes: p.internalNotes ?? null,
      followupSentAt: d(p.followupSentAt), followupWaLink: p.followupWaLink ?? null,
      followupType: p.followupType ?? null, hotAlertSentAt: d(p.hotAlertSentAt),
      lastContactedAt: d(p.lastContactedAt),
      status: p.status, viewCount: p.viewCount ?? 0, lastViewedAt: d(p.lastViewedAt),
      createdAt: d(p.createdAt)!, updatedAt: d(p.updatedAt)!,
    };
    await prisma.proposal.upsert({
      where: { id: p.id },
      update: data,
      create: { id: p.id, ...data },
    });
    const m = /ORC-\d+-(\d+)/.exec(p.proposalCode || '');
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  console.log(`✓ Propostas importadas: ${proposals.length}`);

  // 3. Ajusta o contador para o próximo código não colidir com os importados
  if (maxSeq > 0) {
    await prisma.proposalCounter.upsert({
      where: { id: 'singleton' },
      update: { count: maxSeq },
      create: { id: 'singleton', count: maxSeq },
    });
    console.log(`✓ Contador de propostas ajustado para ${maxSeq}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
