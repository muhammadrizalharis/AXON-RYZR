export interface AppConfig {
  nodeEnv: string;
  port: number;
  globalPrefix: string;
  webUrl: string;
  corsOrigins: string[];
}

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessTtl: string;
  refreshTtl: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface MinioConfig {
  endpoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
  publicUrl?: string;
}

export interface ComfyuiConfig {
  baseUrl: string;
  timeoutMs: number;
  pollIntervalMs: number;
}

export interface QuotaConfig {
  defaultUserCredits: number;
  imageCreditCost: number;
  videoCreditCost: number;
  maxStorageBytesPerUser: number;
}

export interface ThrottleConfig {
  ttl: number;
  limit: number;
}

export interface Configuration {
  app: AppConfig;
  jwt: JwtConfig;
  redis: RedisConfig;
  minio: MinioConfig;
  comfyui: ComfyuiConfig;
  quota: QuotaConfig;
  throttle: ThrottleConfig;
}

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true' || value === '1';
};

const toList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export default (): Configuration => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: toNumber(process.env.API_PORT, 4000),
    globalPrefix: process.env.API_GLOBAL_PREFIX ?? 'api',
    webUrl: process.env.WEB_URL ?? 'http://localhost:3000',
    corsOrigins: toList(process.env.CORS_ORIGINS) ?? ['http://localhost:3000'],
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: toNumber(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
    port: toNumber(process.env.MINIO_PORT, 9000),
    useSSL: toBool(process.env.MINIO_USE_SSL, false),
    accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    bucket: process.env.MINIO_BUCKET ?? 'axon-assets',
    publicUrl: process.env.MINIO_PUBLIC_URL || undefined,
  },
  comfyui: {
    baseUrl: process.env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188',
    timeoutMs: toNumber(process.env.COMFYUI_TIMEOUT_MS, 600000),
    pollIntervalMs: toNumber(process.env.COMFYUI_POLL_INTERVAL_MS, 1500),
  },
  quota: {
    defaultUserCredits: toNumber(process.env.DEFAULT_USER_CREDITS, 100),
    imageCreditCost: toNumber(process.env.IMAGE_CREDIT_COST, 1),
    videoCreditCost: toNumber(process.env.VIDEO_CREDIT_COST, 5),
    maxStorageBytesPerUser: toNumber(
      process.env.MAX_STORAGE_BYTES_PER_USER,
      5_368_709_120,
    ),
  },
  throttle: {
    ttl: toNumber(process.env.THROTTLE_TTL, 60),
    limit: toNumber(process.env.THROTTLE_LIMIT, 120),
  },
});
