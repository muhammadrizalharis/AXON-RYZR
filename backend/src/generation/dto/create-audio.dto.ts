import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAudioDto {
  /** Comma-separated style/genre tags, e.g. "synthwave, 80s, energetic". */
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  prompt!: string;

  /** Optional lyrics with [verse]/[chorus] markers; empty = instrumental. */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  lyrics?: string;

  /** Track length in seconds. */
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(180)
  duration?: number = 60;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(100)
  steps?: number = 50;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  lyricsStrength?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  seed?: number;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
