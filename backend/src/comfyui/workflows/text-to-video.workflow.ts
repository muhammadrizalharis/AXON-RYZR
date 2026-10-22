/**
 * ComfyUI workflow (API format) builder for text-to-video — Wan 2.2 TI2V-5B.
 *
 * Matches the assets installed on the GPU node:
 *   UNETLoader(wan2.2_ti2v_5B_fp16) + CLIPLoader(umt5_xxl_fp8_e4m3fn_scaled, type=wan)
 *   + VAELoader(wan2.2_vae) -> ModelSamplingSD3(shift) -> CLIPTextEncode pos/neg
 *   -> Wan22ImageToVideoLatent (optional start_image for image-to-video) -> KSampler
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
  /**
   * Optional start frame for image-to-video. When set, a LoadImage node is
   * wired into Wan22ImageToVideoLatent.start_image so the clip animates from
   * this image. The name must already exist in ComfyUI's input folder
   * (uploaded via ComfyuiService.uploadImage).
   */
  startImageName?: string;
}

/** Snaps an arbitrary frame count to the nearest valid Wan value (4k+1). */
export function snapWanFrames(frames: number): number {
  return Math.max(5, Math.round((frames - 1) / 4) * 4 + 1);
}

/** Above this frame count the VAE decode switches to tiled mode (VRAM). */
const TILED_DECODE_THRESHOLD = 200;

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
    clip = envStr('COMFYUI_WAN_CLIP', 'umt5_xxl_fp8_e4m3fn_scaled.safetensors'),
    vae = envStr('COMFYUI_WAN_VAE', 'wan2.2_vae.safetensors'),
    shift = envNum('COMFYUI_WAN_SHIFT', 8),
    startImageName,
  } = params;

  const length = snapWanFrames(frames);

  // Long clips decode tiled so VRAM stays bounded on a single GPU.
  const decode =
    length > TILED_DECODE_THRESHOLD
      ? {
          class_type: 'VAEDecodeTiled',
          inputs: {
            samples: ['sample', 0],
            vae: ['vae', 0],
            tile_size: 512,
            overlap: 64,
            temporal_size: 64,
            temporal_overlap: 8,
          },
        }
      : {
          class_type: 'VAEDecode',
          inputs: { samples: ['sample', 0], vae: ['vae', 0] },
        };

  const latentInputs: Record<string, unknown> = {
    vae: ['vae', 0],
    width,
    height,
    length,
    batch_size: 1,
  };
  // Image-to-video: feed the uploaded start frame into the latent node.
  const loadImageNode = startImageName
    ? {
        load_image: {
          class_type: 'LoadImage',
          inputs: { image: startImageName },
        },
      }
    : {};
  if (startImageName) {
    latentInputs.start_image = ['load_image', 0];
  }

  return {
    ...loadImageNode,
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
      inputs: latentInputs,
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
    decode,
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
