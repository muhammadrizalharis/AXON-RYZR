/**
 * ComfyUI workflow (API format) builder for text-to-video.
 *
 * This uses an AnimateDiff-style latent pipeline that outputs an animated
 * sequence combined into a video via VHS_VideoCombine. Model/node names are
 * parameterized to match the motion module + checkpoint installed on the
 * campus GPU node. Adjust `motionModule`/`checkpoint` in generation params
 * if your ComfyUI install uses different assets.
 */

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
  checkpoint?: string;
  motionModule?: string;
}

export function buildTextToVideoWorkflow(
  params: TextToVideoWorkflowParams,
): Record<string, unknown> {
  const {
    prompt,
    negativePrompt = '',
    width,
    height,
    steps,
    cfg,
    seed,
    frames,
    fps,
    samplerName = 'euler',
    scheduler = 'normal',
    checkpoint = 'sd_xl_base_1.0.safetensors',
    motionModule = 'mm_sd_v15_v2.ckpt',
  } = params;

  return {
    '4': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: checkpoint },
    },
    '10': {
      class_type: 'ADE_AnimateDiffLoaderWithContext',
      inputs: {
        model_name: motionModule,
        beta_schedule: 'sqrt_linear (AnimateDiff)',
        model: ['4', 0],
      },
    },
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: { width, height, batch_size: frames },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: { text: prompt, clip: ['4', 1] },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: { text: negativePrompt, clip: ['4', 1] },
    },
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps,
        cfg,
        sampler_name: samplerName,
        scheduler,
        denoise: 1,
        model: ['10', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: { samples: ['3', 0], vae: ['4', 2] },
    },
    '11': {
      class_type: 'VHS_VideoCombine',
      inputs: {
        images: ['8', 0],
        frame_rate: fps,
        loop_count: 0,
        filename_prefix: 'AXON',
        format: 'video/h264-mp4',
        pingpong: false,
        save_output: true,
      },
    },
  };
}
