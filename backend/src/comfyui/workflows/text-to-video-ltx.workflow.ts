/**
 * ComfyUI workflow (API format) builder for text-to-video / image-to-video —
 * LTX-2 (Lightricks) 22B. This is the high-quality engine: a 22B diffusion
 * model with the Gemma-3 text encoder (far stronger prompt adherence than the
 * Wan 5B/umt5 path) and LTX's custom sigma scheduler + advanced sampler.
 *
 * Matches the assets installed on the GPU node (discovered via /object_info):
 *   CheckpointLoaderSimple(ltx-2.3-22b-dev-fp8)  -> MODEL, VAE
 *   LTXAVTextEncoderLoader(gemma_3_12B, ckpt=ltx) -> CLIP
 *   CLIPTextEncode pos/neg -> LTXVConditioning(frame_rate)
 *   EmptyLTXVLatentVideo (T2V)  |  LTXVImgToVideo + LoadImage (I2V)
 *   -> LTXVScheduler(SIGMAS) + KSamplerSelect + RandomNoise + CFGGuider
 *   -> SamplerCustomAdvanced -> VAEDecodeTiled -> CreateVideo -> SaveVideo.
 *
 * This builder ONLY constructs the JSON graph sent to ComfyUI; it does not
 * change any ComfyUI configuration. All asset/setting names are overridable
 * via COMFYUI_LTX_* env so the build tracks the installed models.
 *
 * LTX-2 constraints: width/height multiples of 32; frame count 8k+1.
 */

const envStr = (key: string, fallback: string): string => {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : fallback;
};

const envNum = (key: string, fallback: number): number => {
  const n = Number(process.env[key]);
  return Number.isFinite(n) ? n : fallback;
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
  /** Optional distilled LoRA for the 22B model (models/loras). */
  lora?: string;
  loraStrength?: number;
  /** LTXVScheduler shaping. */
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

const DEFAULT_NEGATIVE =
  'blurry, distorted, low quality, watermark, text, jpeg artifacts, ' +
  'cartoon, deformed, extra limbs, bad anatomy, static, frozen frame, flickering';

/** Snaps an arbitrary frame count to the nearest valid LTX value (8k+1). */
export function snapLtxFrames(frames: number): number {
  return Math.max(9, Math.round((frames - 9) / 8) * 8 + 9);
}

/** Snaps a dimension to a multiple of 32. */
function snap32(n: number): number {
  return Math.max(64, Math.round(n / 32) * 32);
}

export function buildLtxVideoWorkflow(
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
    inputs: {
      text_encoder: textEncoder,
      ckpt_name: checkpoint,
      device: 'default',
    },
  };

  // Optional distilled LoRA on the model path (fewer steps, sharper motion).
  const modelRef: [string, number] = lora ? ['lora', 0] : ['ck', 0];
  const loraNode = lora
    ? {
        lora: {
          class_type: 'LoraLoaderModelOnly',
          inputs: {
            model: ['ck', 0],
            lora_name: lora,
            strength_model: loraStrength,
          },
        },
      }
    : {};

  const positive = {
    class_type: 'CLIPTextEncode',
    inputs: { text: prompt, clip: ['te', 0] },
  };
  const negative = {
    class_type: 'CLIPTextEncode',
    inputs: {
      text: negativePrompt?.trim() || DEFAULT_NEGATIVE,
      clip: ['te', 0],
    },
  };
  const conditioning = {
    class_type: 'LTXVConditioning',
    inputs: {
      positive: ['positive', 0],
      negative: ['negative', 0],
      frame_rate: fps,
    },
  };

  // Image-to-video: feed the uploaded start frame through LTXVImgToVideo, which
  // emits refined conditioning + the seeded latent. Text-to-video uses an empty
  // LTX latent and the plain LTXVConditioning outputs.
  const loadImageNode = startImageName
    ? {
        load_image: {
          class_type: 'LoadImage',
          inputs: { image: startImageName },
        },
      }
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

  const latentRef: [string, number] = startImageName
    ? ['i2v', 2]
    : ['latent', 0];
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
    noise: {
      class_type: 'RandomNoise',
      inputs: { noise_seed: seed },
    },
    guider: {
      class_type: 'CFGGuider',
      inputs: {
        model: modelRef,
        positive: guiderPos,
        negative: guiderNeg,
        cfg,
      },
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
    video: {
      class_type: 'CreateVideo',
      inputs: { images: ['decode', 0], fps },
    },
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
