import { Injectable } from '@nestjs/common';

const DAYS_WITHOUT = 90;
const DAYS_WITH    = 270;
const LEISURE_DAY_CENTS = 15000;
const SAVINGS_MONTHLY_CENTS = 28000;

export interface RoiInput {
  totalCashCents: number;
  areaM2: number;
  propertyValueCents?: number;
}

export interface RoiResult {
  daysWithout: number;
  daysWith: number;
  extraDays: number;
  leisureDayValueCents: number;
  yearlyLeisureGainCents: number;
  paybackMonths: number;
  savingsVsElectricYearlyCents: number;
  propertyValueIncrementCents: number | null;
  headline: string;
  subheadline: string;
  bullets: string[];
}

@Injectable()
export class RoiService {
  calculate(input: RoiInput): RoiResult {
    const { totalCashCents, propertyValueCents } = input;
    const extraDays = DAYS_WITH - DAYS_WITHOUT;
    const yearlyLeisureGainCents = extraDays * LEISURE_DAY_CENTS;
    const paybackMonths = Math.ceil(totalCashCents / (yearlyLeisureGainCents / 12));
    const propertyValueIncrementCents = propertyValueCents ? Math.round(propertyValueCents * 0.05) : null;

    const bullets = [
      `+ ${extraDays} dias de piscina por ano (de 90 para 270 dias)`,
      `R$ ${(yearlyLeisureGainCents/100).toLocaleString('pt-BR')}/ano em lazer aproveitado`,
      `~R$ ${(SAVINGS_MONTHLY_CENTS/100).toLocaleString('pt-BR')}/mes de economia vs aquecedor eletrico`,
      `Investimento se paga em ~${paybackMonths} meses`,
      ...(propertyValueIncrementCents ? [`Valoriza seu imovel em ~R$ ${(propertyValueIncrementCents/100).toLocaleString('pt-BR')}`] : []),
    ];

    return {
      daysWithout: DAYS_WITHOUT, daysWith: DAYS_WITH, extraDays,
      leisureDayValueCents: LEISURE_DAY_CENTS,
      yearlyLeisureGainCents, paybackMonths,
      savingsVsElectricYearlyCents: SAVINGS_MONTHLY_CENTS * 12,
      propertyValueIncrementCents,
      headline: 'Sua piscina vai trabalhar por voce',
      subheadline: `Com ${extraDays} dias a mais por ano, o sistema se paga em ~${paybackMonths} meses.`,
      bullets,
    };
  }
}
