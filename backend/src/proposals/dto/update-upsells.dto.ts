import { IsBoolean } from 'class-validator';
export class UpdateUpsellsDto {
  @IsBoolean() thermalCover: boolean;
  @IsBoolean() wifiController: boolean;
}
