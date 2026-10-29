import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { VOICE_IDS } from '../voice.presets';

export class CreateVoiceDto {
  /** The text to narrate (1–5000 chars). */
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text!: string;

  /** Neural voice id; must be one of the offered voices. */
  @IsOptional()
  @IsString()
  @IsIn(VOICE_IDS)
  voice?: string;

  /** Speaking rate multiplier: 0.5 (slower) … 1.5 (faster). */
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(1.5)
  rate?: number;

  /** Pitch shift in Hz: -50 … 50. */
  @IsOptional()
  @IsNumber()
  @Min(-50)
  @Max(50)
  pitch?: number;

  @IsOptional()
  @IsUUID()
  projectId?: string;
}
