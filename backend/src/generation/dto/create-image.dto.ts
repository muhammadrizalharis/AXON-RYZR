import {
  IsEnum,
  IsInt,
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

export class CreateImageDto {
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
  @IsUUID()
  projectId?: string;
}
