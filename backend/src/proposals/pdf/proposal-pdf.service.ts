import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';

export interface PdfInput {
  clientName: string; whatsapp: string; city: string;
  lengthM: number; widthM: number; areaM2: number; regionLabel: string;
  totalCashCents: number; excessAreaCents: number; displacementCents: number;
  thermalCover: boolean; wifiController: boolean;
  thermalCoverPriceCents: number; wifiControllerPriceCents: number;
  expiresAtStr: string; signatureName?: string; signedAtStr?: string;
}

@Injectable()
export class ProposalPdfService {
  async generate(input: PdfInput): Promise<Buffer> {
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'generate_proposal_pdf.py');
    const payload = JSON.stringify({
      clientName: input.clientName, whatsapp: input.whatsapp, city: input.city,
      lengthM: input.lengthM, widthM: input.widthM, areaM2: input.areaM2,
      regionLabel: input.regionLabel, totalCashCents: input.totalCashCents,
      excessAreaCents: input.excessAreaCents, displacementCents: input.displacementCents,
      thermalCover: input.thermalCover, wifiController: input.wifiController,
      thermalCoverPriceCents: input.thermalCoverPriceCents,
      wifiControllerPriceCents: input.wifiControllerPriceCents,
      expiresAtStr: input.expiresAtStr,
      signatureName: input.signatureName ?? '',
      signedAtStr: input.signedAtStr ?? '',
    });

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const errors: string[] = [];
      const py = spawn('python3', [scriptPath, '--stdin'], { stdio: ['pipe', 'pipe', 'pipe'] });
      py.stdin.write(payload);
      py.stdin.end();
      py.stdout.on('data', (c: Buffer) => chunks.push(c));
      py.stderr.on('data', (d: Buffer) => errors.push(d.toString()));
      py.on('close', (code) => {
        if (code !== 0) reject(new InternalServerErrorException(`PDF error: ${errors.join('')}`));
        else resolve(Buffer.concat(chunks));
      });
    });
  }
}
