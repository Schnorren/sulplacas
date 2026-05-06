import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ProposalStatus } from '../shared/types';
import { subHours } from 'date-fns';

const EMPRESA_WHATSAPP = process.env.EMPRESA_WHATSAPP ?? '5551999999999';

function waLink(phone: string, msg: string): string {
  return `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
}
function proposalUrl(id: string): string {
  return `${process.env.FRONTEND_URL ?? 'https://sulplacas.com.br'}/proposta/${id}`;
}

@Injectable()
export class FollowupService {
  private readonly logger = new Logger(FollowupService.name);
  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async runJobs(): Promise<void> {
    await Promise.allSettled([
      this.checkViewedNotApproved(),
      this.checkNeverOpened24h(),
      this.checkNeverOpened72h(),
      this.checkHotProposals(),
    ]);
  }

  async checkViewedNotApproved(): Promise<void> {
    const proposals = await this.prisma.proposal.findMany({
      where: { status: ProposalStatus.VIEWED, followupSentAt: null,
        lastViewedAt: { lte: subHours(new Date(), 48) }, expiresAt: { gt: new Date() } },
      include: { client: true }, take: 50,
    });
    for (const p of proposals) {
      const url = proposalUrl(p.id);
      const city = (p as any).city ?? 'sua cidade';
      const msg = `Olá ${p.client.name}! Vejo que você conferiu a proposta para sua piscina em ${city}. Ficou alguma dúvida? ${url}`;
      const link = waLink(p.client.whatsapp, msg);
      await this.prisma.proposal.update({ where: { id: p.id },
        data: { followupSentAt: new Date(), followupWaLink: link, followupType: 'VIEWED_NOT_APPROVED' as any } });
      this.logger.log(`Follow-up (viu): ${p.client.name}`);
    }
  }

  async checkNeverOpened24h(): Promise<void> {
    const proposals = await this.prisma.proposal.findMany({
      where: { status: ProposalStatus.SENT, viewCount: 0, followupSentAt: null,
        createdAt: { lte: subHours(new Date(), 24), gte: subHours(new Date(), 72) }, expiresAt: { gt: new Date() } },
      include: { client: true }, take: 50,
    });
    for (const p of proposals) {
      const url = proposalUrl(p.id);
      const msg = `Oi ${p.client.name}! Enviei sua proposta de aquecimento solar. Confira: ${url}`;
      const link = waLink(p.client.whatsapp, msg);
      await this.prisma.proposal.update({ where: { id: p.id },
        data: { followupSentAt: new Date(), followupWaLink: link, followupType: 'NEVER_OPENED_24H' as any } });
    }
  }

  async checkNeverOpened72h(): Promise<void> {
    const proposals = await this.prisma.proposal.findMany({
      where: { status: ProposalStatus.SENT, viewCount: 0, followupType: 'NEVER_OPENED_24H' as any,
        followupSentAt: { lte: subHours(new Date(), 48) }, expiresAt: { gt: new Date() } },
      include: { client: true }, take: 50,
    });
    for (const p of proposals) {
      const url = proposalUrl(p.id);
      const msg = `Olá ${p.client.name}! Sua proposta Sul Placas ainda está válida por 7 dias. ${url}`;
      const link = waLink(p.client.whatsapp, msg);
      await this.prisma.proposal.update({ where: { id: p.id },
        data: { followupSentAt: new Date(), followupWaLink: link, followupType: 'NEVER_OPENED_72H' as any } });
    }
  }

  async checkHotProposals(): Promise<void> {
    const proposals = await this.prisma.proposal.findMany({
      where: { status: ProposalStatus.VIEWED, viewCount: { gte: 5 }, hotAlertSentAt: null, expiresAt: { gt: new Date() } },
      include: { client: true }, take: 20,
    });
    for (const p of proposals) {
      const url = proposalUrl(p.id);
      const city = (p as any).city ?? 'N/A';
      const msg = `PROPOSTA QUENTE - ${p.client.name} (${city}) abriu ${p.viewCount}x. Ligue agora! ${url}`;
      const link = waLink(EMPRESA_WHATSAPP, msg);
      await this.prisma.proposal.update({ where: { id: p.id }, data: { hotAlertSentAt: new Date() } });
      this.logger.warn(`QUENTE: ${p.client.name} (${p.viewCount}x) -> ${link}`);
    }
  }

  async sendManualFollowup(proposalId: string): Promise<{ link: string }> {
    const p = await this.prisma.proposal.findUnique({ where: { id: proposalId }, include: { client: true } });
    if (!p) throw new Error('Proposta nao encontrada');
    const url = proposalUrl(p.id);
    const city = (p as any).city ?? 'sua cidade';
    const msg = `Olá ${p.client.name}! Alguma dúvida sobre sua proposta em ${city}? ${url}`;
    const link = waLink(p.client.whatsapp, msg);
    await this.prisma.proposal.update({ where: { id: proposalId },
      data: { followupSentAt: new Date(), followupWaLink: link, followupType: 'MANUAL' as any } });
    return { link };
  }
}
