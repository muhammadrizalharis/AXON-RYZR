/**
 * ComfyUI workflow (API format) builder for text-to-music — ACE-Step v1 3.5B.
 *
 * Uses the all-in-one checkpoint (models/checkpoints/ace_step_v1_3.5b):
 *   CheckpointLoaderSimple -> ModelSamplingSD3(shift) ->
 *   TextEncodeAceStepAudio(tags, lyrics) [+ ConditioningZeroOut negative]
 *   -> EmptyAceStepLatentAudio(seconds) -> KSampler -> VAEDecodeAudio
 *   -> SaveAudioMP3
 *
 * Reference settings: steps 50, cfg 5, euler/simple, shift 5. `tags` is a
 * comma-separated style/genre description; empty `lyrics` yields an
 * instrumental track. Asset name overridable via COMFYUI_ACE_*.
 */

const envStr = (key: string, fallback: string): string => {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : fallback;
};

const envNum = (key: string, fallback: number): number => {
  const n = Number(process.env[key]);
  return Number.isFinite(n) ? n : fallback;
};

export interface TextToAudioWorkflowParams {
  /** Comma-separated style tags, e.g. "synthwave, 80s, energetic". */
  tags: string;
  /** Song lyrics with optional [verse]/[chorus] markers; empty = instrumental. */
  lyrics?: string;
  seconds: number;
  steps: number;
  cfg: number;
  seed: number;
  lyricsStrength?: number;
  samplerName?: string;
  scheduler?: string;
  /** All-in-one checkpoint (models/checkpoints). */
  checkpoint?: string;
  shift?: number;
}

export function buildTextToAudioWorkflow(
  params: TextToAudioWorkflowParams,
): Record<string, unknown> {
  const {
    tags,
    lyrics = '',
    seconds,
    steps,
    cfg,
    seed,
    lyricsStrength = envNum('COMFYUI_ACE_LYRICS_STRENGTH', 0.99),
    samplerName = envStr('COMFYUI_ACE_SAMPLER', 'euler'),
    scheduler = envStr('COMFYUI_ACE_SCHEDULER', 'simple'),
    checkpoint = envStr('COMFYUI_ACE_CHECKPOINT', 'ace_step_v1_3.5b.safetensors'),
    shift = envNum('COMFYUI_ACE_SHIFT', 5),
  } = params;

  return {
    ckpt: {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: checkpoint },
    },
    model_shift: {
      class_type: 'ModelSamplingSD3',
      inputs: { model: ['ckpt', 0], shift },
    },
    positive: {
      class_type: 'TextEncodeAceStepAudio',
      inputs: {
        clip: ['ckpt', 1],
        tags,
        lyrics,
        lyrics_strength: lyricsStrength,
      },
    },
    negative: {
      class_type: 'ConditioningZeroOut',
      inputs: { conditioning: ['positive', 0] },
    },
    latent: {
      class_type: 'EmptyAceStepLatentAudio',
      inputs: { seconds, batch_size: 1 },
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
      class_type: 'VAEDecodeAudio',
      inputs: { samples: ['sample', 0], vae: ['ckpt', 2] },
    },
    save: {
      class_type: 'SaveAudioMP3',
      inputs: {
        audio: ['decode', 0],
        filename_prefix: 'AXON',
        quality: 'V0',
      },
    },
  };
}
