// backend/src/proposals/pdf/proposal-pdf.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';

export interface PdfUpsell {
  name: string;
  description: string;
  priceCents: number;
}

export interface PdfInput {
  proposalCode:      string;
  clientName:        string;
  whatsapp:          string;
  email?:            string;
  city:              string;
  lengthM:           number;
  widthM:            number;
  areaM2:            number;
  regionLabel:       string;
  totalCashCents:    number;
  excessAreaCents:   number;
  displacementCents: number;
  baseAreaLimit?:    number;
  excessPerM2Cents?: number;
  upsells:           PdfUpsell[];
  rate12x?:          number;   // ex: 112 (= 1.12 × 100)
  rate18x?:          number;   // ex: 116
  months12x?:        number;
  months18x?:        number;
  expiresAtStr:      string;
  createdAtStr?:     string;

  // Retrocompatibilidade (ainda aceitos, mas preferir upsells[])
  thermalCover?:             boolean;
  wifiController?:           boolean;
  thermalCoverPriceCents?:   number;
  wifiControllerPriceCents?: number;
}

@Injectable()
export class ProposalPdfService {
  async generate(input: PdfInput): Promise<Buffer> {
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'generate_proposal_pdf.py');

    const payload = JSON.stringify({
      proposalCode:      input.proposalCode,
      clientName:        input.clientName,
      whatsapp:          input.whatsapp,
      email:             input.email ?? '',
      city:              input.city,
      lengthM:           input.lengthM,
      widthM:            input.widthM,
      areaM2:            input.areaM2,
      regionLabel:       input.regionLabel,
      totalCashCents:    input.totalCashCents,
      excessAreaCents:   input.excessAreaCents,
      displacementCents: input.displacementCents,
      baseAreaLimit:     input.baseAreaLimit  ?? 18,
      excessPerM2Cents:  input.excessPerM2Cents ?? 18000,
      upsells:           input.upsells ?? [],
      rate12x:           input.rate12x  ?? 112,
      rate18x:           input.rate18x  ?? 116,
      months12x:         input.months12x ?? 12,
      months18x:         input.months18x ?? 18,
      expiresAtStr:      input.expiresAtStr,
      createdAtStr:      input.createdAtStr ?? '',
      // campos legados (retrocompat)
      thermalCover:             input.thermalCover            ?? false,
      wifiController:           input.wifiController          ?? false,
      thermalCoverPriceCents:   input.thermalCoverPriceCents  ?? 0,
      wifiControllerPriceCents: input.wifiControllerPriceCents ?? 0,
    });

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const errors: string[] = [];

      const py = spawn('python3', [scriptPath, '--stdin'], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      py.stdin.write(payload);
      py.stdin.end();
      py.stdout.on('data', (c: Buffer) => chunks.push(c));
      py.stderr.on('data', (d: Buffer) => errors.push(d.toString()));
      py.on('close', (code) => {
        if (code !== 0) {
          reject(new InternalServerErrorException(`PDF error: ${errors.join('')}`));
        } else {
          resolve(Buffer.concat(chunks));
        }
      });
    });
  }
}
