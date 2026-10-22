import {
  IsEnum,
  IsInt,
  IsBoolean,
  IsNumber,
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

export class CreateVideoDto {
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
  aspectRatio?: AspectRatio = AspectRatio.LANDSCAPE_16_9;

  @IsOptional()
  @IsEnum(ImageResolution)
  resolution?: ImageResolution = ImageResolution.HD;

  @IsOptional()
  @IsEnum(GenerationStyle)
  style?: GenerationStyle = GenerationStyle.NONE;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(15)
  duration?: number = 5; // seconds

  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(30)
  fps?: number = 24;

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

  /** Base64 (data URL or raw) start frame to animate — image-to-video. */
  @IsOptional()
  @IsString()
  @MaxLength(15_000_000)
  sourceImage?: string;

  /** Attach a music track to the output video. */
  @IsOptional()
  @IsBoolean()
  music?: boolean;

  /** Style/genre brief for auto-generated music; defaults to the main prompt. */
  @IsOptional()
  @IsString()
  @MaxLength(MAX_PROMPT_LENGTH)
  musicPrompt?: string;

  /** Length of auto-generated music in seconds. */
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(180)
  musicDuration?: number;

  /** Use an existing AUDIO job's track instead of generating new music. */
  @IsOptional()
  @IsUUID()
  audioJobId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
