import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
export class SignProposalDto {
  @IsString() @IsNotEmpty() @MaxLength(120) signatureName: string;
}
