import {
  IsEnum,
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
import {
  AspectRatio,
  GenerationStyle,
  ImageResolution,
} from '../generation.presets';

export class CreateVideoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  prompt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
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
  @Max(10)
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
  @IsUUID()
  projectId?: string;
}
