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
  /** Diffusion engine: 'ltx' (LTX-2.3 22B, cinematic), 'wan' (Wan 2.2 5B), or 'ltx25' (LTX-2.5 22B, newest, image-to-video). */
  videoEngine?: 'ltx' | 'wan' | 'ltx25';
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
  /**
   * Voice narration text (Edge-TTS) to speak over the video. When set, it is
   * muxed in as the audio track (takes precedence over music).
   */
  voiceNarration?: string;
  /** Neural voice id for the narration (one of VOICE_IDS). */
  voiceId?: string;
  /** Narration speaking rate multiplier (0.5 … 1.5). */
  voiceRate?: number;
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

// ── Voice (text-to-speech) ──

export interface VoiceOption {
  /** Edge-TTS short name, e.g. "id-ID-ArdiNeural". */
  id: string;
  /** Human-friendly label shown in the UI. */
  label: string;
  gender: 'male' | 'female';
  /** Language group for grouping/labelling. */
  lang: string;
}

/**
 * Curated set of neural voices offered in the Creation Hub. Multilingual
 * voices speak Indonesian naturally too. Keep this list in sync with the
 * backend validator (it is the single source of truth for both sides).
 */
export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'id-ID-ArdiNeural', label: 'Ardi — Pria (Indonesia)', gender: 'male', lang: 'Indonesia' },
  { id: 'id-ID-GadisNeural', label: 'Gadis — Wanita (Indonesia)', gender: 'female', lang: 'Indonesia' },
  { id: 'en-US-AndrewMultilingualNeural', label: 'Andrew — Pria (Multibahasa)', gender: 'male', lang: 'Multibahasa' },
  { id: 'en-US-AvaMultilingualNeural', label: 'Ava — Wanita (Multibahasa)', gender: 'female', lang: 'Multibahasa' },
  { id: 'en-US-GuyNeural', label: 'Guy — Pria (English)', gender: 'male', lang: 'English' },
  { id: 'en-US-JennyNeural', label: 'Jenny — Wanita (English)', gender: 'female', lang: 'English' },
  { id: 'en-GB-RyanNeural', label: 'Ryan — Pria (British)', gender: 'male', lang: 'English (UK)' },
  { id: 'ja-JP-NanamiNeural', label: 'Nanami — Wanita (Jepang)', gender: 'female', lang: 'Jepang' },
];

export const VOICE_IDS: string[] = VOICE_OPTIONS.map((v) => v.id);

export const DEFAULT_VOICE_ID = 'id-ID-ArdiNeural';

export interface CreateVoicePayload {
  /** The text to narrate. */
  text: string;
  /** Edge-TTS voice id; must be one of VOICE_IDS. */
  voice?: string;
  /** Speaking rate multiplier (0.5 = slower, 1.5 = faster). Default 1. */
  rate?: number;
  /** Pitch shift in Hz (-50..50). Default 0. */
  pitch?: number;
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
