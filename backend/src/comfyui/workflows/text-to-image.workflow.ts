/**
 * ComfyUI workflow (API format) builder for text-to-image — FLUX.2 pipeline.
 *
 * Matches the assets installed on the campus GPU node (flux2-dev):
 *   UNETLoader(flux2_dev_fp8mixed) + CLIPLoader(mistral_3_small_flux2, type=flux2)
 *   + VAELoader(flux2-vae) -> EmptyFlux2LatentImage -> CLIPTextEncode -> FluxGuidance
 *   -> BasicGuider -> SamplerCustomAdvanced(RandomNoise + KSamplerSelect + Flux2Scheduler)
 *   -> VAEDecode -> SaveImage
 *
 * FLUX.2 dev is guidance-distilled: no negative prompt / CFG (guidance is baked
 * via FluxGuidance). Asset names are overridable via COMFYUI_FLUX_* env vars so
 * ops can point at whatever is actually installed on the GPU node.
 */

const envStr = (key: string, fallback: string): string => {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : fallback;
};

const envNum = (key: string, fallback: number): number => {
  const n = Number(process.env[key]);
  return Number.isFinite(n) ? n : fallback;
};

export interface TextToImageWorkflowParams {
  prompt: string;
  width: number;
  height: number;
  steps: number;
  seed: number;
  batchSize?: number;
  guidance?: number;
  samplerName?: string;
  /** Diffusion model (models/diffusion_models). */
  unet?: string;
  /** Mistral text encoder (models/text_encoders). */
  clip?: string;
  /** VAE (models/vae). */
  vae?: string;
  /** Optional acceleration LoRA (models/loras); empty = none. */
  lora?: string;
  loraStrength?: number;
  weightDtype?: string;
}

export function buildTextToImageWorkflow(
  params: TextToImageWorkflowParams,
): Record<string, unknown> {
  const {
    prompt,
    width,
    height,
    steps,
    seed,
    batchSize = 1,
    guidance = envNum('COMFYUI_FLUX_GUIDANCE', 3.5),
    samplerName = envStr('COMFYUI_FLUX_SAMPLER', 'euler'),
    unet = envStr('COMFYUI_FLUX_UNET', 'flux2_dev_fp8mixed.safetensors'),
    clip = envStr('COMFYUI_FLUX_CLIP', 'mistral_3_small_flux2_fp8.safetensors'),
    vae = envStr('COMFYUI_FLUX_VAE', 'flux2-vae.safetensors'),
    lora = envStr('COMFYUI_FLUX_LORA', ''),
    loraStrength = envNum('COMFYUI_FLUX_LORA_STRENGTH', 1),
    weightDtype = envStr('COMFYUI_FLUX_WEIGHT_DTYPE', 'default'),
  } = params;

  const graph: Record<
    string,
    { class_type: string; inputs: Record<string, unknown> }
  > = {
    unet: {
      class_type: 'UNETLoader',
      inputs: { unet_name: unet, weight_dtype: weightDtype },
    },
    clip: {
      class_type: 'CLIPLoader',
      inputs: { clip_name: clip, type: 'flux2', device: 'default' },
    },
    vae: {
      class_type: 'VAELoader',
      inputs: { vae_name: vae },
    },
    latent: {
      class_type: 'EmptyFlux2LatentImage',
      inputs: { width, height, batch_size: batchSize },
    },
    positive: {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['clip', 0] },
    },
    fluxguidance: {
      class_type: 'FluxGuidance',
      inputs: { conditioning: ['positive', 0], guidance },
    },
    ksampler_select: {
      class_type: 'KSamplerSelect',
      inputs: { sampler_name: samplerName },
    },
    sigmas: {
      class_type: 'Flux2Scheduler',
      inputs: { steps, width, height },
    },
    noise: {
      class_type: 'RandomNoise',
      inputs: { noise_seed: seed },
    },
    guider: {
      class_type: 'BasicGuider',
      inputs: { model: ['unet', 0], conditioning: ['fluxguidance', 0] },
    },
    sample: {
      class_type: 'SamplerCustomAdvanced',
      inputs: {
        noise: ['noise', 0],
        guider: ['guider', 0],
        sampler: ['ksampler_select', 0],
        sigmas: ['sigmas', 0],
        latent_image: ['latent', 0],
      },
    },
    decode: {
      class_type: 'VAEDecode',
      inputs: { samples: ['sample', 0], vae: ['vae', 0] },
    },
    save: {
      class_type: 'SaveImage',
      inputs: { images: ['decode', 0], filename_prefix: 'AXON' },
    },
  };

  // Optional acceleration LoRA (e.g. Flux.2 Turbo) applied to the model only.
  if (lora) {
    graph.lora = {
      class_type: 'LoraLoaderModelOnly',
      inputs: {
        model: ['unet', 0],
        lora_name: lora,
        strength_model: loraStrength,
      },
    };
    graph.guider.inputs.model = ['lora', 0];
  }

  return graph;
}
