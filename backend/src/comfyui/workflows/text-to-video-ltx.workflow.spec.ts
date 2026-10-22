import {
  buildLtxVideoWorkflow,
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

  it('builds a text-to-video graph with LTX-2 + Gemma encoder (no start image)', () => {
    const wf = buildLtxVideoWorkflow(base) as Graph;
    expect(wf.ck.class_type).toBe('CheckpointLoaderSimple');
    expect(wf.te.class_type).toBe('LTXAVTextEncoderLoader');
    expect(wf.latent.class_type).toBe('EmptyLTXVLatentVideo');
    expect(wf.i2v).toBeUndefined();
    expect(wf.load_image).toBeUndefined();
    // sampler reads the empty latent
    expect(wf.sample.inputs.latent_image).toEqual(['latent', 0]);
    expect(wf.guider.inputs.positive).toEqual(['cond', 0]);
  });

  it('wires LoadImage + LTXVImgToVideo for image-to-video', () => {
    const wf = buildLtxVideoWorkflow({
      ...base,
      startImageName: 'uploads/i2v-source.png',
    }) as Graph;
    expect(wf.load_image.class_type).toBe('LoadImage');
    expect(wf.load_image.inputs.image).toBe('uploads/i2v-source.png');
    expect(wf.i2v.class_type).toBe('LTXVImgToVideo');
    expect(wf.i2v.inputs.image).toEqual(['load_image', 0]);
    expect(wf.latent).toBeUndefined();
    // sampler + guider read the img2video latent/conditioning
    expect(wf.sample.inputs.latent_image).toEqual(['i2v', 2]);
    expect(wf.guider.inputs.positive).toEqual(['i2v', 0]);
    expect(wf.guider.inputs.negative).toEqual(['i2v', 1]);
  });

  it('adds a distilled LoRA node only when configured', () => {
    const withLora = buildLtxVideoWorkflow({
      ...base,
      lora: 'ltx-2.3-22b-distilled-lora-384.safetensors',
    }) as Graph;
    expect(withLora.lora.class_type).toBe('LoraLoaderModelOnly');
    expect(withLora.guider.inputs.model).toEqual(['lora', 0]);

    const noLora = buildLtxVideoWorkflow(base) as Graph;
    expect(noLora.lora).toBeUndefined();
    expect(noLora.guider.inputs.model).toEqual(['ck', 0]);
  });

  it('snaps frame counts to the LTX 8k+1 constraint', () => {
    expect(snapLtxFrames(73)).toBe(73);
    expect(snapLtxFrames(1)).toBe(9);
    expect((snapLtxFrames(120) - 9) % 8).toBe(0);
  });
});
