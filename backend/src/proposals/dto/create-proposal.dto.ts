import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateProposalDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(10)
  whatsapp: string;

  @IsNumber()
  @IsPositive()
  lengthM: number;

  @IsNumber()
  @IsPositive()
  widthM: number;

  /** Cidade do cliente — usada para calcular custo de deslocamento */
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  clientCity: string;

  /**
   * Custo de deslocamento em CENTAVOS definido pelo admin ao criar a proposta.
   * O frontend admin envia esse valor já calculado com base na cidade escolhida,
   * ou o admin pode digitar manualmente.
   * Default: 0
   */
  @IsOptional()
  @IsNumber()
  displacementCostCents?: number;
}