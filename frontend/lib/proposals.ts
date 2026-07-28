import { prisma } from './prisma';

const BOT_UA_REGEX = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|skype|preview|embed|headless|curl|wget|python-requests|axios|node-fetch|undici|okhttp|go-http/i;

let configCache: { map: Record<string, number>; at: number } | null = null;
const CONFIG_TTL_MS = 60_000;

async function getConfigMap(): Promise<Record<string, number>> {
  const now = Date.now();
  if (configCache && now - configCache.at < CONFIG_TTL_MS) return configCache.map;
  const configs = await prisma.pricingConfig.findMany();
  const map = Object.fromEntries(configs.map((c) => [c.key, c.value]));
  configCache = { map, at: now };
  return map;
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatInstallment(totalCents: number, rateX100: number, months: number) {
  const total = totalCents * (rateX100 / 100);
  return formatBRL(Math.round(total / months));
}

export async function generateProposalCode() {
  const counter = await prisma.proposalCounter.upsert({
    where: { id: 'singleton' },
    update: { count: { increment: 1 } as any },
    create: { id: 'singleton', count: 1 },
  } as any);
  const year = new Date().getFullYear();
  const seq = String(counter.count).padStart(4, '0');
  return `ORC-${year}-${seq}`;
}

export async function logEvent(proposalId: string, type: string, payload?: object) {
  await prisma.proposalEvent.create({ data: { proposalId, type, payload: payload ?? undefined } as any });
}

export async function calcPrice(
  areaM2: number,
  displacementCostCents: number,
  selectedUpsellIds: string[] = [],
  hiddenMarginCents = 0,
) {
  const cfg = await getConfigMap();

  const basePriceCents = cfg['BASE_PRICE'] ?? 390000;
  const baseAreaLimit = (cfg['BASE_AREA_LIMIT_M2'] ?? 1800) / 100;
  const excessPerM2 = cfg['EXCESS_PER_M2'] ?? 18000;
  const rate12x = cfg['INSTALLMENT_12X_RATE'] ?? 112;
  const rate18x = cfg['INSTALLMENT_18X_RATE'] ?? 116;
  const collectorExtraPerM2 = cfg['COLLECTOR_EXTRA_PER_M2'] ?? 0;
  const cardMachineRateBp = cfg['CARD_MACHINE_RATE'] ?? 0;

  const excessM2 = Math.max(0, areaM2 - baseAreaLimit);
  const excessPriceCents = Math.round(excessM2 * excessPerM2);
  const collectorExtraCents = Math.round(areaM2 * collectorExtraPerM2);

  let upsellTotalCents = 0;
  if (selectedUpsellIds.length > 0) {
    const upsells = await prisma.upsellProduct.findMany({ where: { id: { in: selectedUpsellIds }, active: true } });
    upsellTotalCents = upsells.reduce((sum, u) => sum + (u.priceCents ?? 0), 0);
  }

  const totalCashCents = basePriceCents + excessPriceCents + collectorExtraCents + displacementCostCents + upsellTotalCents + hiddenMarginCents;
  const cardRate = 1 + cardMachineRateBp / 10000;
  const totalCardCents = Math.round(totalCashCents * cardRate);

  return {
    basePriceCents,
    excessPriceCents,
    collectorExtraCents,
    upsellTotalCents,
    totalCashCents,
    pricing: {
      areaM2,
      totalCash: formatBRL(totalCashCents),
      totalCard: cardMachineRateBp > 0 ? formatBRL(totalCardCents) : null,
      installment12x: formatInstallment(totalCashCents, rate12x, 12),
      installment18x: formatInstallment(totalCashCents, rate18x, 18),
      cardInstallment12x: cardMachineRateBp > 0 ? formatInstallment(totalCardCents, rate12x, 12) : null,
      cardInstallment18x: cardMachineRateBp > 0 ? formatInstallment(totalCardCents, rate18x, 18) : null,
      breakdown: {
        base: formatBRL(basePriceCents),
        excess: formatBRL(excessPriceCents),
        displacement: formatBRL(displacementCostCents),
        upsells: formatBRL(upsellTotalCents),
        hiddenMargin: hiddenMarginCents > 0 ? formatBRL(hiddenMarginCents) : null,
      },
    },
  };
}

export { BOT_UA_REGEX };
