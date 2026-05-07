import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateCityDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsNumber()
  @Min(0)
  baseDeslocamento: number; // em centavos
}