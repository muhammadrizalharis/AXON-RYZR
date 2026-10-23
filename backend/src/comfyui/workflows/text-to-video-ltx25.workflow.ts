/**
 * ComfyUI workflow (API format) builder for image-to-video — LTX-2.5 (Lightricks)
 * 22B distilled. This is the newest/highest-fidelity open engine and uses a very
 * different graph from LTX-2.3: the weights ship as separate files (UNET + two
 * VAEs + Gemma-4 CLIP + a latent spatial upscaler) and the distilled sampler runs
 * a fixed two-stage schedule.
 *
 * Pipeline (faithfully reproduces the official LTX-2.5 i2v template, validated
 * end-to-end against ComfyUI v0.32.0 on the GPU node):
 *   UNETLoader + VAELoader(video) + VAELoader(audio) + CLIPLoader(ltxv) +
 *   LatentUpscaleModelLoader
 *   LoadImage -> LTXVPreprocess
 *   CLIPTextEncode pos/neg -> LTXVConditioning(frame_rate)
 *   Stage A (base, half resolution):
 *     EmptyLTXVLatentVideo -> LTXVImgToVideoInplace(strength) +
 *     LTXVEmptyLatentAudio -> LTXVConcatAVLatent ->
 *     SamplerCustomAdvanced(ManualSigmas long, LTXVDualCFGGuider, euler_ancestral)
 *     -> LTXVSeparateAVLatent
 *   Stage B (refine, 2x spatial upscale):
 *     LTXVLatentUpsampler -> LTXVImgToVideoInplace(1.0) + audio from stage A ->
 *     LTXVConcatAVLatent ->
 *     SamplerCustomAdvanced(ManualSigmas short, LTXVDualCFGGuider, euler_ancestral)
 *     -> LTXVSeparateAVLatent
 *   VAEDecodeTiled(video) + LTXVAudioVAEDecode(audio) -> CreateVideo -> SaveVideo.
 *
 * The distilled model requires the ManualSigmas custom schedule + dual-CFG guider
 * + euler_ancestral, so a single-stage graph will not work — the two-stage shape
 * is intrinsic to the model and is kept intact.
 *
 * This builder ONLY constructs the JSON graph; it changes no ComfyUI config. All
 * asset/schedule names are overridable via COMFYUI_LTX25_* env so the build tracks
 * the installed models.
 *
 * LTX-2.5 constraints: the base latent renders at half resolution and is upscaled
 * 2x, so output width/height must be multiples of 64; frame count is 8k+1.
 */

const envStr = (key: string, fallback: string): string => {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : fallback;
};

const envNum = (key: string, fallback: number): number => {
  const n = Number(process.env[key]);
  return Number.isFinite(n) ? n : fallback;
};

export interface Ltx25VideoWorkflowParams {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  seed: number;
  frames: number;
  fps: number;
  /** Start frame for image-to-video (must exist in ComfyUI's input folder). */
  startImageName: string;
  /** How strongly the start image constrains stage A (0..1). */
  imageStrength?: number;
  samplerName?: string;
  /** UNET transformer (models/diffusion_models). */
  unet?: string;
  /** Video VAE (models/vae). */
  videoVae?: string;
  /** Audio VAE (models/vae). */
  audioVae?: string;
  /** Gemma-4 text encoder (models/text_encoders). */
  clip?: string;
  /** Latent spatial upscaler x2 (models/latent_upscale_models). */
  upscaler?: string;
}

const DEFAULT_NEGATIVE =
  'pc game, console game, video game, cartoon, childish, ugly';

/** Snaps an arbitrary frame count to the nearest valid LTX value (8k+1). */
export function snapLtx25Frames(frames: number): number {
  return Math.max(9, Math.round((frames - 9) / 8) * 8 + 9);
}

/** Snaps a dimension to a multiple of 64 (so the half-res base latent is 32-aligned). */
function snap64(n: number): number {
  return Math.max(128, Math.round(n / 64) * 64);
}

export function buildLtx25VideoWorkflow(
  params: Ltx25VideoWorkflowParams,
): Record<string, unknown> {
  const {
    prompt,
    negativePrompt,
    width,
    height,
    seed,
    frames,
    fps,
    startImageName,
    imageStrength = envNum('COMFYUI_LTX25_IMAGE_STRENGTH', 0.7),
    samplerName = envStr('COMFYUI_LTX25_SAMPLER', 'euler_ancestral'),
    unet = envStr(
      'COMFYUI_LTX25_UNET',
      'ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors',
    ),
    videoVae = envStr(
      'COMFYUI_LTX25_VAE_VIDEO',
      'ltx-2.5-video-vae-bf16.safetensors',
    ),
    audioVae = envStr(
      'COMFYUI_LTX25_VAE_AUDIO',
      'ltx-2.5-audio-vae-bf16.safetensors',
    ),
    clip = envStr(
      'COMFYUI_LTX25_CLIP',
      'gemma4-12b-with-proj-ltx-2.5-comfy-int8-convrot.safetensors',
    ),
    upscaler = envStr(
      'COMFYUI_LTX25_UPSCALER',
      'ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors',
    ),
  } = params;

  const w = snap64(width);
  const h = snap64(height);
  const length = snapLtx25Frames(frames);
  const halfW = w / 2;
  const halfH = h / 2;

  // The distilled two-stage schedules. Stage A denoises from near-1.0 over the
  // long sigma list; stage B refines the upscaled latent over the short list.
  const baseSigmas = envStr(
    'COMFYUI_LTX25_BASE_SIGMAS',
    '1.0, 0.99375, 0.9875, 0.98125, 0.975, 0.909375, 0.725, 0.421875, 0.0',
  );
  const refineSigmas = envStr(
    'COMFYUI_LTX25_REFINE_SIGMAS',
    '0.85, 0.7250, 0.4219, 0.0',
  );

  return {
    // --- Loaders ---
    unet: {
      class_type: 'UNETLoader',
      inputs: { unet_name: unet, weight_dtype: 'default' },
    },
    vae_v: { class_type: 'VAELoader', inputs: { vae_name: videoVae } },
    vae_a: { class_type: 'VAELoader', inputs: { vae_name: audioVae } },
    clip: {
      class_type: 'CLIPLoader',
      inputs: { clip_name: clip, type: 'ltxv', device: 'default' },
    },
    upscaler: {
      class_type: 'LatentUpscaleModelLoader',
      inputs: { model_name: upscaler },
    },

    // --- Text conditioning ---
    pos: {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['clip', 0] },
    },
    neg: {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: negativePrompt?.trim() || DEFAULT_NEGATIVE,
        clip: ['clip', 0],
      },
    },
    cond: {
      class_type: 'LTXVConditioning',
      inputs: {
        positive: ['pos', 0],
        negative: ['neg', 0],
        frame_rate: fps,
      },
    },

    // --- Start frame ---
    loadimg: {
      class_type: 'LoadImage',
      inputs: { image: startImageName },
    },
    pre: {
      class_type: 'LTXVPreprocess',
      inputs: { image: ['loadimg', 0], img_compression: 18 },
    },

    // --- Stage A: base (half resolution) ---
    base_latent: {
      class_type: 'EmptyLTXVLatentVideo',
      inputs: { width: halfW, height: halfH, length, batch_size: 1 },
    },
    base_i2v: {
      class_type: 'LTXVImgToVideoInplace',
      inputs: {
        vae: ['vae_v', 0],
        image: ['pre', 0],
        latent: ['base_latent', 0],
        strength: imageStrength,
        bypass: false,
      },
    },
    audio_latent: {
      class_type: 'LTXVEmptyLatentAudio',
      inputs: {
        frames_number: length,
        frame_rate: fps,
        batch_size: 1,
        audio_vae: ['vae_a', 0],
      },
    },
    base_av: {
      class_type: 'LTXVConcatAVLatent',
      inputs: {
        video_latent: ['base_i2v', 0],
        audio_latent: ['audio_latent', 0],
      },
    },
    base_sigmas: {
      class_type: 'ManualSigmas',
      inputs: { sigmas: baseSigmas },
    },
    base_guider: {
      class_type: 'LTXVDualCFGGuider',
      inputs: {
        model: ['unet', 0],
        positive: ['cond', 0],
        negative: ['cond', 1],
        video_cfg: 1,
        audio_cfg: 1,
      },
    },
    base_sampler_sel: {
      class_type: 'KSamplerSelect',
      inputs: { sampler_name: samplerName },
    },
    base_noise: {
      class_type: 'RandomNoise',
      inputs: { noise_seed: seed },
    },
    base_sample: {
      class_type: 'SamplerCustomAdvanced',
      inputs: {
        noise: ['base_noise', 0],
        guider: ['base_guider', 0],
        sampler: ['base_sampler_sel', 0],
        sigmas: ['base_sigmas', 0],
        latent_image: ['base_av', 0],
      },
    },
    base_sep: {
      class_type: 'LTXVSeparateAVLatent',
      inputs: { av_latent: ['base_sample', 0] },
    },

    // --- Stage B: refine (2x spatial upscale) ---
    up: {
      class_type: 'LTXVLatentUpsampler',
      inputs: {
        samples: ['base_sep', 0],
        upscale_model: ['upscaler', 0],
        vae: ['vae_v', 0],
      },
    },
    ref_i2v: {
      class_type: 'LTXVImgToVideoInplace',
      inputs: {
        vae: ['vae_v', 0],
        image: ['pre', 0],
        latent: ['up', 0],
        strength: 1,
        bypass: false,
      },
    },
    ref_av: {
      class_type: 'LTXVConcatAVLatent',
      inputs: {
        video_latent: ['ref_i2v', 0],
        audio_latent: ['base_sep', 1],
      },
    },
    ref_sigmas: {
      class_type: 'ManualSigmas',
      inputs: { sigmas: refineSigmas },
    },
    ref_guider: {
      class_type: 'LTXVDualCFGGuider',
      inputs: {
        model: ['unet', 0],
        positive: ['cond', 0],
        negative: ['cond', 1],
        video_cfg: 1,
        audio_cfg: 1,
      },
    },
    ref_sampler_sel: {
      class_type: 'KSamplerSelect',
      inputs: { sampler_name: samplerName },
    },
    ref_noise: {
      class_type: 'RandomNoise',
      inputs: { noise_seed: seed + 1 },
    },
    ref_sample: {
      class_type: 'SamplerCustomAdvanced',
      inputs: {
        noise: ['ref_noise', 0],
        guider: ['ref_guider', 0],
        sampler: ['ref_sampler_sel', 0],
        sigmas: ['ref_sigmas', 0],
        latent_image: ['ref_av', 0],
      },
    },
    ref_sep: {
      class_type: 'LTXVSeparateAVLatent',
      inputs: { av_latent: ['ref_sample', 0] },
    },

    // --- Decode + mux ---
    decode: {
      class_type: 'VAEDecodeTiled',
      inputs: {
        samples: ['ref_sep', 0],
        vae: ['vae_v', 0],
        tile_size: 512,
        overlap: 64,
        temporal_size: 64,
        temporal_overlap: 16,
      },
    },
    audio_decode: {
      class_type: 'LTXVAudioVAEDecode',
      inputs: { samples: ['ref_sep', 1], audio_vae: ['vae_a', 0] },
    },
    video: {
      class_type: 'CreateVideo',
      inputs: {
        images: ['decode', 0],
        fps,
        audio: ['audio_decode', 0],
        bit_depth: 8,
      },
    },
    save: {
      class_type: 'SaveVideo',
      inputs: {
        video: ['video', 0],
        filename_prefix: `AXON_LTX25_${seed}`,
        format: 'mp4',
        codec: 'auto',
      },
    },
  };
}
