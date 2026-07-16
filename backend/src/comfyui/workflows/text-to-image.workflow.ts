/**
 * ComfyUI workflow (API format) builder for text-to-image.
 *
 * The node graph mirrors ComfyUI's default SD/SDXL pipeline:
 *   CheckpointLoaderSimple -> CLIPTextEncode(x2) -> KSampler -> VAEDecode -> SaveImage
 *
 * Parameters are injected so the same template serves every request.
 * Node/model names can be overridden via generation params to match the
 * checkpoints installed on the campus GPU node.
 */

export interface TextToImageWorkflowParams {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  steps: number;
  cfg: number;
  seed: number;
  samplerName?: string;
  scheduler?: string;
  checkpoint?: string;
  batchSize?: number;
}

export function buildTextToImageWorkflow(
  params: TextToImageWorkflowParams,
): Record<string, unknown> {
  const {
    prompt,
    negativePrompt = '',
    width,
    height,
    steps,
    cfg,
    seed,
    samplerName = 'euler',
    scheduler = 'normal',
    checkpoint = process.env.COMFYUI_DEFAULT_CHECKPOINT ||
      'sd_xl_base_1.0.safetensors',
    batchSize = 1,
  } = params;

  return {
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps,
        cfg,
        sampler_name: samplerName,
        scheduler,
        denoise: 1,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
    },
    '4': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: checkpoint },
    },
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: { width, height, batch_size: batchSize },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['4', 1] },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: { text: negativePrompt, clip: ['4', 1] },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: { samples: ['3', 0], vae: ['4', 2] },
    },
    '9': {
      class_type: 'SaveImage',
      inputs: { filename_prefix: 'AXON', images: ['8', 0] },
    },
  };
}
