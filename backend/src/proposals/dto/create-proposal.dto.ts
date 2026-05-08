// backend/src/proposals/dto/create-proposal.dto.ts

import { IsString, IsNumber, IsOptional, IsInt, IsEmail, Min } from 'class-validator';

export class CreateProposalDto {
  @IsString()
  name: string;

  @IsString()
  whatsapp: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNumber()
  lengthM: number;

  @IsNumber()
  widthM: number;

  @IsOptional()
  @IsString()
  clientCity?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displacementCostCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  hiddenMarginCents?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  validityDays?: number;
}
