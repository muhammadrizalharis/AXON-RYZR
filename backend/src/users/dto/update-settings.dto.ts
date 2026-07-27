import { IsInt, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  /** Credits granted to newly registered users. */
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  defaultUserCredits!: number;
}
