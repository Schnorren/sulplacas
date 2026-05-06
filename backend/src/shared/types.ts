// src/shared/types.ts
// Enums espelhados do schema Prisma para evitar dependência de geração em tempo de build

export enum Region {
  PORTO_ALEGRE     = 'PORTO_ALEGRE',
  REGIAO_METRO     = 'REGIAO_METRO',
  INTERIOR_LITORAL = 'INTERIOR_LITORAL',
}

export enum ProposalStatus {
  DRAFT    = 'DRAFT',
  SENT     = 'SENT',
  VIEWED   = 'VIEWED',
  APPROVED = 'APPROVED',
  EXPIRED  = 'EXPIRED',
  LOST     = 'LOST',
}

export enum FollowupType {
  VIEWED_NOT_APPROVED = 'VIEWED_NOT_APPROVED',
  NEVER_OPENED_24H    = 'NEVER_OPENED_24H',
  NEVER_OPENED_72H    = 'NEVER_OPENED_72H',
  MANUAL              = 'MANUAL',
}
