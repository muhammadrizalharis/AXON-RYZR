export enum AspectRatio {
  SQUARE = '1:1',
  LANDSCAPE_16_9 = '16:9',
  PORTRAIT_9_16 = '9:16',
  LANDSCAPE_4_3 = '4:3',
  PORTRAIT_3_4 = '3:4',
  LANDSCAPE_3_2 = '3:2',
  PORTRAIT_2_3 = '2:3',
}

export enum ImageResolution {
  SD = 'SD', // ~512 base
  HD = 'HD', // ~768 base
  FHD = 'FHD', // ~1024 base
  QHD = 'QHD', // ~1536 base
}

export enum GenerationStyle {
  NONE = 'none',
  PHOTOREALISTIC = 'photorealistic',
  CINEMATIC = 'cinematic',
  ANIME = 'anime',
  DIGITAL_ART = 'digital-art',
  THREE_D = '3d-render',
  WATERCOLOR = 'watercolor',
  NEON = 'neon',
}

const ASPECT_MAP: Record<AspectRatio, { w: number; h: number }> = {
  [AspectRatio.SQUARE]: { w: 1, h: 1 },
  [AspectRatio.LANDSCAPE_16_9]: { w: 16, h: 9 },
  [AspectRatio.PORTRAIT_9_16]: { w: 9, h: 16 },
  [AspectRatio.LANDSCAPE_4_3]: { w: 4, h: 3 },
  [AspectRatio.PORTRAIT_3_4]: { w: 3, h: 4 },
  [AspectRatio.LANDSCAPE_3_2]: { w: 3, h: 2 },
  [AspectRatio.PORTRAIT_2_3]: { w: 2, h: 3 },
};

const BASE_SIZE: Record<ImageResolution, number> = {
  [ImageResolution.SD]: 512,
  [ImageResolution.HD]: 768,
  [ImageResolution.FHD]: 1024,
  [ImageResolution.QHD]: 1536,
};

const STYLE_PROMPTS: Record<GenerationStyle, string> = {
  [GenerationStyle.NONE]: '',
  [GenerationStyle.PHOTOREALISTIC]:
    'photorealistic, ultra detailed, sharp focus, 8k, professional photography',
  [GenerationStyle.CINEMATIC]:
    'cinematic lighting, film grain, dramatic composition, movie still',
  [GenerationStyle.ANIME]: 'anime style, vibrant colors, cel shading, detailed',
  [GenerationStyle.DIGITAL_ART]:
    'digital art, concept art, highly detailed, trending on artstation',
  [GenerationStyle.THREE_D]:
    '3d render, octane render, ray tracing, physically based rendering',
  [GenerationStyle.WATERCOLOR]:
    'watercolor painting, soft edges, artistic, hand painted',
  [GenerationStyle.NEON]:
    'neon lights, cyberpunk, glowing, vibrant, futuristic',
};

const roundTo = (value: number, multiple: number): number =>
  Math.max(multiple, Math.round(value / multiple) * multiple);

/**
 * Resolves aspect ratio + resolution into ComfyUI-friendly pixel dimensions
 * (multiples of 64). Caps the long edge to keep VRAM usage sane.
 */
export function resolveDimensions(
  aspect: AspectRatio,
  resolution: ImageResolution,
  maxLongEdge = 1536,
): { width: number; height: number } {
  const ratio = ASPECT_MAP[aspect];
  const base = BASE_SIZE[resolution];

  // Scale so the shorter side ~= base, then clamp the longer side.
  const scale = base / Math.min(ratio.w, ratio.h);
  let width = ratio.w * scale;
  let height = ratio.h * scale;

  const longEdge = Math.max(width, height);
  if (longEdge > maxLongEdge) {
    const clamp = maxLongEdge / longEdge;
    width *= clamp;
    height *= clamp;
  }

  return { width: roundTo(width, 64), height: roundTo(height, 64) };
}

/**
 * Appends style keywords to a base prompt.
 */
export function applyStyle(prompt: string, style: GenerationStyle): string {
  const suffix = STYLE_PROMPTS[style];
  return suffix ? `${prompt.trim()}, ${suffix}` : prompt.trim();
}
