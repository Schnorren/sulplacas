import { IsArray, IsString } from 'class-validator';

export class UpdateUpsellsDto {
  /** Array de IDs de UpsellProduct selecionados pelo cliente */
  @IsArray()
  @IsString({ each: true })
  selectedUpsellIds: string[];
}
