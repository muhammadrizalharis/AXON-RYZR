import { IsJWT, IsString } from 'class-validator';

export class RefreshDto {
  @IsString()
  @IsJWT({ message: 'A valid refresh token is required' })
  refreshToken!: string;
}
