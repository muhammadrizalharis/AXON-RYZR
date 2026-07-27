import { IsBoolean } from 'class-validator';

export class ShareAssetDto {
  @IsBoolean()
  isPublic!: boolean;
}
