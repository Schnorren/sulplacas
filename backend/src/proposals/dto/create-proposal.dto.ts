import { IsString, IsNotEmpty, IsNumber, IsPositive, IsEnum, IsOptional } from 'class-validator';
import { Region } from '../../shared/types';

export class CreateProposalDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() whatsapp: string;
  @IsString() @IsOptional() city?: string;
  @IsNumber() @IsPositive() lengthM: number;
  @IsNumber() @IsPositive() widthM: number;
  @IsEnum(Region) region: Region;
  @IsNumber() @IsOptional() propertyValueCents?: number;
}
