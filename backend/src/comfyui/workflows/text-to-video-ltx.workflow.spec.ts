import {
  buildLtxVideoWorkflow,
  resolveNegativePrompt,
  snapLtxFrames,
} from './text-to-video-ltx.workflow';

describe('buildLtxVideoWorkflow', () => {
  const base = {
    prompt: 'a photorealistic man speaking to the camera',
    width: 768,
    height: 512,
    steps: 25,
    cfg: 3,
    seed: 42,
    frames: 73,
    fps: 24,
  };

  type Graph = Record<
    string,
    { class_type: string; inputs: Record<string, unknown> }
  >;

  describe('high-quality two-stage pipeline (default)', () => {
    it('builds a distilled two-stage text-to-video graph', () => {
      const wf = buildLtxVideoWorkflow(base) as Graph;
      // model + encoder + distilled LoRA on by default
      expect(wf.ck.class_type).toBe('CheckpointLoaderSimple');
      expect(wf.te.class_type).toBe('LTXAVTextEncoderLoader');
      expect(wf.lora.class_type).toBe('LoraLoaderModelOnly');
      expect(wf.lora.inputs.lora_name).toBe(
        'ltx-2.3-22b-distilled-lora-384.safetensors',
      );
      // text-to-video uses an empty latent, no image nodes
      expect(wf.latent.class_type).toBe('EmptyLTXVLatentVideo');
      expect(wf.i2v).toBeUndefined();
      expect(wf.load_image).toBeUndefined();
      // base stage: distilled sigmas + cfg_pp sampler + CFG 1
      expect(wf.base_sigmas.class_type).toBe('ManualSigmas');
      expect(wf.sel_base.inputs.sampler_name).toBe('euler_ancestral_cfg_pp');
      expect(wf.guider.inputs.cfg).toBe(1);
      expect(wf.guider.inputs.model).toEqual(['lora', 0]);
      expect(wf.sample.inputs.latent_image).toEqual(['latent', 0]);
      // spatial x2 upscale between stages
      expect(wf.ups.class_type).toBe('LatentUpscaleModelLoader');
      expect(wf.upsample.class_type).toBe('LTXVLatentUpsampler');
      expect(wf.upsample.inputs.samples).toEqual(['sample', 0]);
      // refine stage reads the upscaled latent
      expect(wf.sel_ref.inputs.sampler_name).toBe('euler_cfg_pp');
      expect(wf.sample_ref.inputs.latent_image).toEqual(['upsample', 0]);
      // decode reads the refine output
      expect(wf.decode.inputs.samples).toEqual(['sample_ref', 0]);
    });

    it('renders the base latent at half the (64-snapped) resolution', () => {
      const wf = buildLtxVideoWorkflow({
        ...base,
        width: 704,
        height: 1280,
      }) as Graph;
      expect(wf.latent.inputs.width).toBe(352);
      expect(wf.latent.inputs.height).toBe(640);
    });

    it('wires LoadImage + LTXVImgToVideo for image-to-video', () => {
      const wf = buildLtxVideoWorkflow({
        ...base,
        startImageName: 'uploads/i2v-source.png',
      }) as Graph;
      expect(wf.load_image.class_type).toBe('LoadImage');
      expect(wf.i2v.class_type).toBe('LTXVImgToVideo');
      expect(wf.latent).toBeUndefined();
      expect(wf.sample.inputs.latent_image).toEqual(['i2v', 2]);
      expect(wf.guider.inputs.positive).toEqual(['i2v', 0]);
      expect(wf.guider.inputs.negative).toEqual(['i2v', 1]);
    });
  });

  describe('legacy single-stage pipeline (hq=false)', () => {
    it('builds the single-stage LTXVScheduler graph', () => {
      const wf = buildLtxVideoWorkflow({ ...base, hq: false }) as Graph;
      expect(wf.sigmas.class_type).toBe('LTXVScheduler');
      expect(wf.latent.class_type).toBe('EmptyLTXVLatentVideo');
      expect(wf.upsample).toBeUndefined();
      expect(wf.sample.inputs.latent_image).toEqual(['latent', 0]);
      // no LoRA unless explicitly configured
      expect(wf.lora).toBeUndefined();
      expect(wf.guider.inputs.model).toEqual(['ck', 0]);
    });

    it('adds a distilled LoRA node when configured', () => {
      const wf = buildLtxVideoWorkflow({
        ...base,
        hq: false,
        lora: 'ltx-2.3-22b-distilled-lora-384.safetensors',
      }) as Graph;
      expect(wf.lora.class_type).toBe('LoraLoaderModelOnly');
      expect(wf.guider.inputs.model).toEqual(['lora', 0]);
    });
  });

  describe('resolveNegativePrompt', () => {
    it('uses the curated default when the user negative is empty', () => {
      expect(resolveNegativePrompt(undefined, 'a cat')).toContain('blurry');
      expect(resolveNegativePrompt('   ', 'a cat')).toContain('blurry');
    });

    it('merges a real user negative with the curated default', () => {
      const out = resolveNegativePrompt('ugly hands', 'a cat');
      expect(out.startsWith('ugly hands, ')).toBe(true);
      expect(out).toContain('blurry');
    });

    it('ignores a negative that merely echoes the positive prompt', () => {
      const prompt = 'A small business owner writing sales in a notebook';
      const out = resolveNegativePrompt(prompt, prompt);
      expect(out).toBe(resolveNegativePrompt(undefined, prompt));
    });
  });

  it('snaps frame counts to the LTX 8k+1 constraint', () => {
    expect(snapLtxFrames(73)).toBe(73);
    expect(snapLtxFrames(1)).toBe(9);
    expect((snapLtxFrames(120) - 9) % 8).toBe(0);
  });
});
