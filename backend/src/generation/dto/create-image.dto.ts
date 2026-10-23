import {
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  AspectRatio,
  GenerationStyle,
  ImageResolution,
  MAX_PROMPT_LENGTH,
} from '../generation.presets';

export class CreateImageDto {
  @IsString()
  @MinLength(3)
  @MaxLength(MAX_PROMPT_LENGTH)
  prompt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_PROMPT_LENGTH)
  negativePrompt?: string;

  @IsOptional()
  @IsEnum(AspectRatio)
  aspectRatio?: AspectRatio = AspectRatio.SQUARE;

  @IsOptional()
  @IsEnum(ImageResolution)
  resolution?: ImageResolution = ImageResolution.FHD;

  @IsOptional()
  @IsEnum(GenerationStyle)
  style?: GenerationStyle = GenerationStyle.NONE;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  batchSize?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  steps?: number = 25;

  @IsOptional()
  @IsInt()
  @Min(0)
  seed?: number;

  @IsOptional()
  @IsBoolean()
  verifyText?: boolean;

  /**
   * Base64 (data URL or raw) character reference photo. When provided, FLUX.2
   * keeps this person's identity (face/subject) while rendering the new prompt.
   */
  @IsOptional()
  @IsString()
  @MaxLength(15_000_000)
  characterImage?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
