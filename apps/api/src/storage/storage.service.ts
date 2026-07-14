import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as MinioClient } from 'minio';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { MinioConfig } from '../config/configuration';

export interface UploadResult {
  storageKey: string;
  bucket: string;
  size: number;
  mimeType: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: MinioClient;
  private readonly config: MinioConfig;

  constructor(configService: ConfigService) {
    this.config = configService.getOrThrow<MinioConfig>('minio');
    this.client = new MinioClient({
      endPoint: this.config.endpoint,
      port: this.config.port,
      useSSL: this.config.useSSL,
      accessKey: this.config.accessKey,
      secretKey: this.config.secretKey,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.config.bucket);
      if (!exists) {
        await this.client.makeBucket(this.config.bucket);
        this.logger.log(`Created MinIO bucket: ${this.config.bucket}`);
      }
    } catch (err) {
      // Non-fatal at boot: log and continue so the API can still start.
      this.logger.warn(
        `MinIO bucket check failed (will retry on demand): ${
          (err as Error).message
        }`,
      );
    }
  }

  get bucket(): string {
    return this.config.bucket;
  }

  /**
   * Builds a per-user namespaced object key (isolation per-user).
   * Example: users/<userId>/2026/07/<uuid>.png
   */
  buildKey(userId: string, filename: string): string {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const ext = extname(filename) || '';
    return `users/${userId}/${yyyy}/${mm}/${randomUUID()}${ext}`;
  }

  async uploadBuffer(
    userId: string,
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<UploadResult> {
    await this.ensureBucket();
    const storageKey = this.buildKey(userId, filename);

    await this.client.putObject(
      this.config.bucket,
      storageKey,
      buffer,
      buffer.length,
      { 'Content-Type': mimeType },
    );

    return {
      storageKey,
      bucket: this.config.bucket,
      size: buffer.length,
      mimeType,
    };
  }

  /**
   * Returns a URL for accessing an object. Uses the public base URL if
   * configured, otherwise generates a time-limited presigned URL.
   */
  async getUrl(storageKey: string, expirySeconds = 3600): Promise<string> {
    if (this.config.publicUrl) {
      const base = this.config.publicUrl.replace(/\/$/, '');
      return `${base}/${this.config.bucket}/${storageKey}`;
    }
    try {
      return await this.client.presignedGetObject(
        this.config.bucket,
        storageKey,
        expirySeconds,
      );
    } catch (err) {
      throw new InternalServerErrorException(
        `Failed to generate object URL: ${(err as Error).message}`,
      );
    }
  }

  async remove(storageKey: string): Promise<void> {
    await this.client.removeObject(this.config.bucket, storageKey);
  }

  async removeMany(storageKeys: string[]): Promise<void> {
    if (storageKeys.length === 0) return;
    await this.client.removeObjects(this.config.bucket, storageKeys);
  }

  private async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.config.bucket);
    if (!exists) {
      await this.client.makeBucket(this.config.bucket);
    }
  }
}
