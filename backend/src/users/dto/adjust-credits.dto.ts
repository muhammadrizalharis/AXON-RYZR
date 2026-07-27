import { IsInt, IsOptional, IsString, MaxLength, NotEquals } from 'class-validator';

export class AdjustCreditsDto {
  /** Positive = grant, negative = deduct (balance can never go below zero). */
  @IsInt()
  @NotEquals(0)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
