import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class UpdateCityDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  baseDeslocamento?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}