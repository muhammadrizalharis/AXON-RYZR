/**
 * AXON-RYZR — shared contracts between the NestJS API and the Next.js web app.
 * Pure types + const maps (no runtime dependencies).
 */

// ── Enumerations (as const unions to stay framework-agnostic) ──

export const Role = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const JobType = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
} as const;
export type JobType = (typeof JobType)[keyof typeof JobType];

export const JobStatus = {
  QUEUED: 'QUEUED',
  RENDERING: 'RENDERING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const AssetType = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  AUDIO: 'AUDIO',
} as const;
export type AssetType = (typeof AssetType)[keyof typeof AssetType];

export const AspectRatio = {
  SQUARE: '1:1',
  LANDSCAPE_16_9: '16:9',
  PORTRAIT_9_16: '9:16',
  LANDSCAPE_4_3: '4:3',
  PORTRAIT_3_4: '3:4',
  LANDSCAPE_3_2: '3:2',
  PORTRAIT_2_3: '2:3',
} as const;
export type AspectRatio = (typeof AspectRatio)[keyof typeof AspectRatio];

export const ImageResolution = {
  SD: 'SD',
  HD: 'HD',
  FHD: 'FHD',
  QHD: 'QHD',
} as const;
export type ImageResolution =
  (typeof ImageResolution)[keyof typeof ImageResolution];

export const GenerationStyle = {
  NONE: 'none',
  PHOTOREALISTIC: 'photorealistic',
  CINEMATIC: 'cinematic',
  ANIME: 'anime',
  DIGITAL_ART: 'digital-art',
  THREE_D: '3d-render',
  WATERCOLOR: 'watercolor',
  NEON: 'neon',
} as const;
export type GenerationStyle =
  (typeof GenerationStyle)[keyof typeof GenerationStyle];

// ── Entities (API responses) ──

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  credits: number;
  storageUsed: string; // BigInt serialized as string
  storageLimit?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  userId: string;
  jobId?: string | null;
  projectId?: string | null;
  type: AssetType;
  storageKey: string;
  bucket: string;
  mimeType: string;
  fileSize: string;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  isPublic: boolean;
  url: string;
  createdAt: string;
  /** Present on community feed responses. */
  user?: { name: string } | null;
  /** Present when the API includes the source job. */
  job?: { prompt: string; type?: JobType } | null;
}

export interface Job {
  id: string;
  userId: string;
  projectId?: string | null;
  type: JobType;
  status: JobStatus;
  prompt: string;
  negativePrompt?: string | null;
  params: Record<string, unknown>;
  creditsCost: number;
  progress: number;
  error?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  assets: Asset[];
  createdAt: string;
  updatedAt: string;
  /** Present on admin oversight responses. */
  user?: { id: string; name: string; email: string; role: Role } | null;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { jobs: number; assets: number };
}

// ── Auth payloads ──

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// ── Generation payloads ──

export interface CreateImagePayload {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: AspectRatio;
  resolution?: ImageResolution;
  style?: GenerationStyle;
  batchSize?: number;
  steps?: number;
  seed?: number;
  /** Base64 (data URL or raw) character reference — FLUX.2 identity lock. */
  characterImage?: string;
  projectId?: string;
}

export interface CreateVideoPayload {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: AspectRatio;
  resolution?: ImageResolution;
  style?: GenerationStyle;
  duration?: number;
  fps?: number;
  steps?: number;
  seed?: number;
  /** Diffusion engine: 'ltx' (LTX-2 22B, cinematic) or 'wan' (Wan 2.2 5B). */
  videoEngine?: 'ltx' | 'wan';
  /** Base64 (data URL or raw) start frame to animate — image-to-video. */
  sourceImage?: string;
  /**
   * Base64 (data URL or raw) character reference. A FLUX.2 keyframe preserving
   * this person's identity is rendered for the scene, then animated — "my
   * character as an actor".
   */
  characterImage?: string;
  /** Attach a music track to the output video. */
  music?: boolean;
  /** Style/genre brief for auto-generated music; defaults to the main prompt. */
  musicPrompt?: string;
  /** Length of auto-generated music in seconds. */
  musicDuration?: number;
  /** Use an existing AUDIO job's track instead of generating new music. */
  audioJobId?: string;
  projectId?: string;
}

export interface CreateAudioPayload {
  /** Comma-separated style/genre tags. */
  prompt: string;
  /** Optional lyrics; empty = instrumental. */
  lyrics?: string;
  /** Track length in seconds (5-180). */
  duration?: number;
  steps?: number;
  lyricsStrength?: number;
  seed?: number;
  projectId?: string;
}

// ── Realtime events ──

export interface JobEventPayload {
  jobId: string;
  status: JobStatus;
  progress: number;
  type?: JobType;
  error?: string | null;
  assets?: Array<{ id: string; url: string; type: AssetType }>;
}

// ── Pagination ──

export interface Paginated<T> {
  items: T[];
  total: number;
  skip: number;
  take: number;
}
