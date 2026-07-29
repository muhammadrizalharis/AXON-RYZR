/**
 * ComfyUI workflow (API format) builder for text-to-video — Wan 2.2 TI2V-5B.
 *
 * Matches the assets installed on the GPU node:
 *   UNETLoader(wan2.2_ti2v_5B_fp16) + CLIPLoader(umt5_xxl_fp8_e4m3fn_scaled, type=wan)
 *   + VAELoader(wan2.2_vae) -> ModelSamplingSD3(shift) -> CLIPTextEncode pos/neg
 *   -> Wan22ImageToVideoLatent (no start_image = pure T2V) -> KSampler
 *   -> VAEDecode -> CreateVideo -> SaveVideo (mp4/h264)
 *
 * Wan 2.2 constraints: dimensions in multiples of 32, frame count must be
 * 4k+1 (temporal VAE compression). Reference settings: 1280x704 @ 24 fps,
 * cfg 5, uni_pc/simple, shift 8. Asset names overridable via COMFYUI_WAN_*.
 */

const envStr = (key: string, fallback: string): string => {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : fallback;
};

const envNum = (key: string, fallback: number): number => {
  const n = Number(process.env[key]);
  return Number.isFinite(n) ? n : fallback;
};

export interface TextToVideoWorkflowParams {
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
  scheduler?: string;
  /** Diffusion model (models/diffusion_models). */
  unet?: string;
  /** UMT5 text encoder (models/text_encoders). */
  clip?: string;
  /** Wan VAE (models/vae). */
  vae?: string;
  shift?: number;
}

/** Snaps an arbitrary frame count to the nearest valid Wan value (4k+1). */
export function snapWanFrames(frames: number): number {
  return Math.max(5, Math.round((frames - 1) / 4) * 4 + 1);
}

const DEFAULT_NEGATIVE =
  'blurry, distorted, low quality, watermark, text, jpeg artifacts, ' +
  'static, frozen frame, flickering';

export function buildTextToVideoWorkflow(
  params: TextToVideoWorkflowParams,
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
    samplerName = envStr('COMFYUI_WAN_SAMPLER', 'uni_pc'),
    scheduler = envStr('COMFYUI_WAN_SCHEDULER', 'simple'),
    unet = envStr('COMFYUI_WAN_UNET', 'wan2.2_ti2v_5B_fp16.safetensors'),
    clip = envStr(
      'COMFYUI_WAN_CLIP',
      'umt5_xxl_fp8_e4m3fn_scaled.safetensors',
    ),
    vae = envStr('COMFYUI_WAN_VAE', 'wan2.2_vae.safetensors'),
    shift = envNum('COMFYUI_WAN_SHIFT', 8),
  } = params;

  return {
    unet: {
      class_type: 'UNETLoader',
      inputs: { unet_name: unet, weight_dtype: 'default' },
    },
    clip: {
      class_type: 'CLIPLoader',
      inputs: { clip_name: clip, type: 'wan', device: 'default' },
    },
    vae: {
      class_type: 'VAELoader',
      inputs: { vae_name: vae },
    },
    model_shift: {
      class_type: 'ModelSamplingSD3',
      inputs: { model: ['unet', 0], shift },
    },
    positive: {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['clip', 0] },
    },
    negative: {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: negativePrompt?.trim() || DEFAULT_NEGATIVE,
        clip: ['clip', 0],
      },
    },
    latent: {
      class_type: 'Wan22ImageToVideoLatent',
      inputs: {
        vae: ['vae', 0],
        width,
        height,
        length: snapWanFrames(frames),
        batch_size: 1,
      },
    },
    sample: {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps,
        cfg,
        sampler_name: samplerName,
        scheduler,
        denoise: 1,
        model: ['model_shift', 0],
        positive: ['positive', 0],
        negative: ['negative', 0],
        latent_image: ['latent', 0],
      },
    },
    decode: {
      class_type: 'VAEDecode',
      inputs: { samples: ['sample', 0], vae: ['vae', 0] },
    },
    video: {
      class_type: 'CreateVideo',
      inputs: { images: ['decode', 0], fps },
    },
    save: {
      class_type: 'SaveVideo',
      inputs: {
        video: ['video', 0],
        filename_prefix: 'AXON',
        format: 'mp4',
        codec: 'h264',
      },
    },
  };
}
