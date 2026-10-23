/**
 * ComfyUI workflow (API format) builder for text-to-video / image-to-video —
 * LTX-2 (Lightricks) 22B. This is the high-quality engine: a 22B diffusion
 * model with the Gemma-3 text encoder (far stronger prompt adherence than the
 * Wan 5B/umt5 path).
 *
 * HIGH-QUALITY (HQ) PIPELINE — default. Replicates the production recipe that
 * yields sharp, realistic motion:
 *   1. distilled LoRA (ltx-2.3-22b-distilled-lora-384, strength 0.5)
 *   2. base render at HALF resolution using the distilled sigma schedule +
 *      euler_ancestral_cfg_pp + CFG 1.0
 *   3. LTXVLatentUpsampler (spatial x2) -> refine pass (short distilled sigma
 *      schedule + euler_cfg_pp + CFG 1.0) -> final at full resolution
 *   4. VAEDecodeTiled -> CreateVideo -> SaveVideo
 *
 * The distilled LoRA REQUIRES the ManualSigmas schedule + the *_cfg_pp samplers
 * at CFG 1.0 — using the plain LTXVScheduler/euler at CFG 3 (the legacy path)
 * produces washed-out, incoherent motion. The two-stage upscale is what makes
 * the output look real and sharp instead of soft/low-res.
 *
 * Set COMFYUI_LTX_HQ=0 to fall back to the legacy single-stage graph.
 *
 * This builder ONLY constructs the JSON graph sent to ComfyUI; it does not
 * change any ComfyUI configuration. All asset/setting names are overridable
 * via COMFYUI_LTX_* env so the build tracks the installed models.
 *
 * LTX-2 constraints: width/height multiples of 64 (so the half-res base stays a
 * multiple of 32); frame count 8k+1.
 */

const envStr = (key: string, fallback: string): string => {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : fallback;
};

const envNum = (key: string, fallback: number): number => {
  const n = Number(process.env[key]);
  return Number.isFinite(n) ? n : fallback;
};

const envBool = (key: string, fallback: boolean): boolean => {
  const v = process.env[key];
  if (v === undefined || v.trim() === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(v.trim().toLowerCase());
};

export interface LtxVideoWorkflowParams {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  steps: number;
  cfg: number;
  seed: number;
  frames: number;
  fps: number;
  samplerName?: string;
  /** LTX-2 checkpoint (models/checkpoints). */
  checkpoint?: string;
  /** Gemma-3 text encoder (models/text_encoders). */
  textEncoder?: string;
  /** Distilled LoRA for the 22B model (models/loras). Empty string disables. */
  lora?: string;
  loraStrength?: number;
  /** Spatial x2 latent upscaler (models/latent_upscale_models). */
  upscaler?: string;
  /** Force the high-quality two-stage pipeline on/off. Defaults to env. */
  hq?: boolean;
  /** LTXVScheduler shaping (legacy single-stage only). */
  maxShift?: number;
  baseShift?: number;
  /**
   * Optional start frame for image-to-video. When set, a LoadImage node feeds
   * LTXVImgToVideo so the clip animates from this image. The name must already
   * exist in ComfyUI's input folder (uploaded via ComfyuiService.uploadImage).
   */
  startImageName?: string;
  /** How strongly the start image constrains the first frame (0..1). */
  imageStrength?: number;
}

/**
 * Curated negative prompt. Always applied so quality never depends on what the
 * user typed (or forgot to type) in the UI. A caller-supplied negative is
 * merged in, never replaced, and is ignored when it merely echoes the positive
 * prompt (a common mistake that actively fights the generation).
 */
const DEFAULT_NEGATIVE =
  'blurry, distorted, low quality, low resolution, watermark, text, ' +
  'jpeg artifacts, cartoon, anime, childish, deformed, disfigured, ' +
  'extra limbs, extra fingers, mutated hands, bad anatomy, warped face, ' +
  'static, frozen frame, flickering, jittery motion, oversaturated, duplicate';

/** Distilled schedule for the base pass (8 steps). */
const BASE_SIGMAS =
  '1.0, 0.99375, 0.9875, 0.98125, 0.975, 0.909375, 0.725, 0.421875, 0.0';
/** Short distilled schedule for the upscaled refine pass (3 steps). */
const REFINE_SIGMAS = '0.85, 0.7250, 0.4219, 0.0';

/** Builds the effective negative prompt from the curated default + user text. */
export function resolveNegativePrompt(
  userNegative: string | undefined,
  positivePrompt: string,
): string {
  const neg = userNegative?.trim();
  if (!neg) return DEFAULT_NEGATIVE;
  // Guard against the common UI mistake of pasting the scene description into
  // the negative box — that would tell the model to avoid what we want.
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  if (norm(neg) === norm(positivePrompt)) return DEFAULT_NEGATIVE;
  return `${neg}, ${DEFAULT_NEGATIVE}`;
}

/** Snaps an arbitrary frame count to the nearest valid LTX value (8k+1). */
export function snapLtxFrames(frames: number): number {
  return Math.max(9, Math.round((frames - 9) / 8) * 8 + 9);
}

/** Snaps a dimension to a multiple of 64 (keeps the half-res base 32-aligned). */
function snap64(n: number): number {
  return Math.max(128, Math.round(n / 64) * 64);
}

/** Snaps a dimension to a multiple of 32. */
function snap32(n: number): number {
  return Math.max(64, Math.round(n / 32) * 32);
}

export function buildLtxVideoWorkflow(
  params: LtxVideoWorkflowParams,
): Record<string, unknown> {
  const hq = params.hq ?? envBool('COMFYUI_LTX_HQ', true);
  return hq ? buildHqGraph(params) : buildLegacyGraph(params);
}

/* ------------------------------------------------------------------ */
/* High-quality two-stage pipeline (default)                           */
/* ------------------------------------------------------------------ */

function buildHqGraph(
  params: LtxVideoWorkflowParams,
): Record<string, unknown> {
  const {
    prompt,
    negativePrompt,
    width,
    height,
    seed,
    frames,
    fps,
    checkpoint = envStr('COMFYUI_LTX_CKPT', 'ltx-2.3-22b-dev-fp8.safetensors'),
    textEncoder = envStr(
      'COMFYUI_LTX_ENCODER',
      'gemma_3_12B_it_fp4_mixed.safetensors',
    ),
    lora = envStr(
      'COMFYUI_LTX_LORA',
      'ltx-2.3-22b-distilled-lora-384.safetensors',
    ),
    loraStrength = envNum('COMFYUI_LTX_LORA_STRENGTH', 0.5),
    upscaler = envStr(
      'COMFYUI_LTX_UPSCALER',
      'ltx-2.3-spatial-upscaler-x2-1.1.safetensors',
    ),
    startImageName,
    imageStrength = envNum('COMFYUI_LTX_IMAGE_STRENGTH', 1),
  } = params;

  const baseSampler = envStr('COMFYUI_LTX_BASE_SAMPLER', 'euler_ancestral_cfg_pp');
  const refineSampler = envStr('COMFYUI_LTX_REFINE_SAMPLER', 'euler_cfg_pp');
  const videoCfg = envNum('COMFYUI_LTX_VIDEO_CFG', 1);

  const fullW = snap64(width);
  const fullH = snap64(height);
  const baseW = snap32(fullW / 2);
  const baseH = snap32(fullH / 2);
  const length = snapLtxFrames(frames);

  const checkpointNode = {
    class_type: 'CheckpointLoaderSimple',
    inputs: { ckpt_name: checkpoint },
  };
  const encoderNode = {
    class_type: 'LTXAVTextEncoderLoader',
    inputs: { text_encoder: textEncoder, ckpt_name: checkpoint, device: 'default' },
  };

  // Distilled LoRA on the model path (required by the distilled sigma schedule).
  const modelRef: [string, number] = lora ? ['lora', 0] : ['ck', 0];
  const loraNode = lora
    ? {
        lora: {
          class_type: 'LoraLoaderModelOnly',
          inputs: { model: ['ck', 0], lora_name: lora, strength_model: loraStrength },
        },
      }
    : {};

  const positive = {
    class_type: 'CLIPTextEncode',
    inputs: { text: prompt, clip: ['te', 0] },
  };
  const negative = {
    class_type: 'CLIPTextEncode',
    inputs: { text: resolveNegativePrompt(negativePrompt, prompt), clip: ['te', 0] },
  };
  const conditioning = {
    class_type: 'LTXVConditioning',
    inputs: { positive: ['positive', 0], negative: ['negative', 0], frame_rate: fps },
  };

  // Base latent: image-to-video feeds LTXVImgToVideo; text-to-video uses an
  // empty LTX latent at HALF resolution (the x2 upscaler restores full size).
  const loadImageNode = startImageName
    ? { load_image: { class_type: 'LoadImage', inputs: { image: startImageName } } }
    : {};
  const i2vNode = startImageName
    ? {
        i2v: {
          class_type: 'LTXVImgToVideo',
          inputs: {
            positive: ['cond', 0],
            negative: ['cond', 1],
            vae: ['ck', 2],
            image: ['load_image', 0],
            width: baseW,
            height: baseH,
            length,
            batch_size: 1,
            strength: imageStrength,
          },
        },
      }
    : {};
  const emptyLatentNode = startImageName
    ? {}
    : {
        latent: {
          class_type: 'EmptyLTXVLatentVideo',
          inputs: { width: baseW, height: baseH, length, batch_size: 1 },
        },
      };

  const baseLatentRef: [string, number] = startImageName
    ? ['i2v', 2]
    : ['latent', 0];
  const basePos: [string, number] = startImageName ? ['i2v', 0] : ['cond', 0];
  const baseNeg: [string, number] = startImageName ? ['i2v', 1] : ['cond', 1];

  return {
    ck: checkpointNode,
    te: encoderNode,
    ...loraNode,
    ups: {
      class_type: 'LatentUpscaleModelLoader',
      inputs: { model_name: upscaler },
    },
    positive,
    negative,
    cond: conditioning,
    ...loadImageNode,
    ...i2vNode,
    ...emptyLatentNode,

    // --- Stage A: base render (half resolution) ---
    base_sigmas: { class_type: 'ManualSigmas', inputs: { sigmas: BASE_SIGMAS } },
    sel_base: {
      class_type: 'KSamplerSelect',
      inputs: { sampler_name: baseSampler },
    },
    noise: { class_type: 'RandomNoise', inputs: { noise_seed: seed } },
    guider: {
      class_type: 'CFGGuider',
      inputs: { model: modelRef, positive: basePos, negative: baseNeg, cfg: videoCfg },
    },
    sample: {
      class_type: 'SamplerCustomAdvanced',
      inputs: {
        noise: ['noise', 0],
        guider: ['guider', 0],
        sampler: ['sel_base', 0],
        sigmas: ['base_sigmas', 0],
        latent_image: baseLatentRef,
      },
    },

    // --- Spatial upscale x2 ---
    upsample: {
      class_type: 'LTXVLatentUpsampler',
      inputs: { samples: ['sample', 0], upscale_model: ['ups', 0], vae: ['ck', 2] },
    },

    // --- Stage B: refine on the upscaled latent (full resolution) ---
    ref_sigmas: { class_type: 'ManualSigmas', inputs: { sigmas: REFINE_SIGMAS } },
    sel_ref: {
      class_type: 'KSamplerSelect',
      inputs: { sampler_name: refineSampler },
    },
    noise2: { class_type: 'RandomNoise', inputs: { noise_seed: seed + 1 } },
    guider2: {
      class_type: 'CFGGuider',
      inputs: {
        model: modelRef,
        positive: ['cond', 0],
        negative: ['cond', 1],
        cfg: videoCfg,
      },
    },
    sample_ref: {
      class_type: 'SamplerCustomAdvanced',
      inputs: {
        noise: ['noise2', 0],
        guider: ['guider2', 0],
        sampler: ['sel_ref', 0],
        sigmas: ['ref_sigmas', 0],
        latent_image: ['upsample', 0],
      },
    },

    decode: {
      class_type: 'VAEDecodeTiled',
      inputs: {
        samples: ['sample_ref', 0],
        vae: ['ck', 2],
        tile_size: 768,
        overlap: 64,
        temporal_size: 64,
        temporal_overlap: 8,
      },
    },
    video: { class_type: 'CreateVideo', inputs: { images: ['decode', 0], fps } },
    save: {
      class_type: 'SaveVideo',
      inputs: {
        video: ['video', 0],
        filename_prefix: `AXON_${seed}`,
        format: 'mp4',
        codec: 'h264',
      },
    },
  };
}

/* ------------------------------------------------------------------ */
/* Legacy single-stage pipeline (COMFYUI_LTX_HQ=0)                     */
/* ------------------------------------------------------------------ */

function buildLegacyGraph(
  params: LtxVideoWorkflowParams,
): Record<string, unknown> {
  const {
    prompt,
    negativePrompt,
    width,
    height,
    steps,
    cfg,
    seed,
    frames,
    fps,
    samplerName = envStr('COMFYUI_LTX_SAMPLER', 'euler'),
    checkpoint = envStr('COMFYUI_LTX_CKPT', 'ltx-2.3-22b-dev-fp8.safetensors'),
    textEncoder = envStr(
      'COMFYUI_LTX_ENCODER',
      'gemma_3_12B_it_fp4_mixed.safetensors',
    ),
    lora = envStr('COMFYUI_LTX_LORA', ''),
    loraStrength = envNum('COMFYUI_LTX_LORA_STRENGTH', 0.5),
    maxShift = envNum('COMFYUI_LTX_MAX_SHIFT', 2.05),
    baseShift = envNum('COMFYUI_LTX_BASE_SHIFT', 0.95),
    startImageName,
    imageStrength = envNum('COMFYUI_LTX_IMAGE_STRENGTH', 1),
  } = params;

  const w = snap32(width);
  const h = snap32(height);
  const length = snapLtxFrames(frames);

  const checkpointNode = {
    class_type: 'CheckpointLoaderSimple',
    inputs: { ckpt_name: checkpoint },
  };
  const encoderNode = {
    class_type: 'LTXAVTextEncoderLoader',
    inputs: { text_encoder: textEncoder, ckpt_name: checkpoint, device: 'default' },
  };

  const modelRef: [string, number] = lora ? ['lora', 0] : ['ck', 0];
  const loraNode = lora
    ? {
        lora: {
          class_type: 'LoraLoaderModelOnly',
          inputs: { model: ['ck', 0], lora_name: lora, strength_model: loraStrength },
        },
      }
    : {};

  const positive = {
    class_type: 'CLIPTextEncode',
    inputs: { text: prompt, clip: ['te', 0] },
  };
  const negative = {
    class_type: 'CLIPTextEncode',
    inputs: { text: resolveNegativePrompt(negativePrompt, prompt), clip: ['te', 0] },
  };
  const conditioning = {
    class_type: 'LTXVConditioning',
    inputs: { positive: ['positive', 0], negative: ['negative', 0], frame_rate: fps },
  };

  const loadImageNode = startImageName
    ? { load_image: { class_type: 'LoadImage', inputs: { image: startImageName } } }
    : {};
  const i2vNode = startImageName
    ? {
        i2v: {
          class_type: 'LTXVImgToVideo',
          inputs: {
            positive: ['cond', 0],
            negative: ['cond', 1],
            vae: ['ck', 2],
            image: ['load_image', 0],
            width: w,
            height: h,
            length,
            batch_size: 1,
            strength: imageStrength,
          },
        },
      }
    : {};
  const emptyLatentNode = startImageName
    ? {}
    : {
        latent: {
          class_type: 'EmptyLTXVLatentVideo',
          inputs: { width: w, height: h, length, batch_size: 1 },
        },
      };

  const latentRef: [string, number] = startImageName ? ['i2v', 2] : ['latent', 0];
  const guiderPos: [string, number] = startImageName ? ['i2v', 0] : ['cond', 0];
  const guiderNeg: [string, number] = startImageName ? ['i2v', 1] : ['cond', 1];

  return {
    ck: checkpointNode,
    te: encoderNode,
    ...loraNode,
    positive,
    negative,
    cond: conditioning,
    ...loadImageNode,
    ...i2vNode,
    ...emptyLatentNode,
    sigmas: {
      class_type: 'LTXVScheduler',
      inputs: {
        steps,
        max_shift: maxShift,
        base_shift: baseShift,
        stretch: true,
        terminal: 0.1,
        latent: latentRef,
      },
    },
    sampler_select: {
      class_type: 'KSamplerSelect',
      inputs: { sampler_name: samplerName },
    },
    noise: { class_type: 'RandomNoise', inputs: { noise_seed: seed } },
    guider: {
      class_type: 'CFGGuider',
      inputs: { model: modelRef, positive: guiderPos, negative: guiderNeg, cfg },
    },
    sample: {
      class_type: 'SamplerCustomAdvanced',
      inputs: {
        noise: ['noise', 0],
        guider: ['guider', 0],
        sampler: ['sampler_select', 0],
        sigmas: ['sigmas', 0],
        latent_image: latentRef,
      },
    },
    decode: {
      class_type: 'VAEDecodeTiled',
      inputs: {
        samples: ['sample', 0],
        vae: ['ck', 2],
        tile_size: 768,
        overlap: 64,
        temporal_size: 64,
        temporal_overlap: 8,
      },
    },
    video: { class_type: 'CreateVideo', inputs: { images: ['decode', 0], fps } },
    save: {
      class_type: 'SaveVideo',
      inputs: {
        video: ['video', 0],
        filename_prefix: `AXON_${seed}`,
        format: 'mp4',
        codec: 'h264',
      },
    },
  };
}
