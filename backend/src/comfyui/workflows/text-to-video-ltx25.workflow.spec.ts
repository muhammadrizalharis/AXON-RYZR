import {
  buildLtx25VideoWorkflow,
  snapLtx25Frames,
} from './text-to-video-ltx25.workflow';

describe('buildLtx25VideoWorkflow', () => {
  const base = {
    prompt: 'a photorealistic man speaking to the camera',
    width: 1280,
    height: 704,
    seed: 42,
    frames: 121,
    fps: 24,
    startImageName: 'uploads/i2v-source.png',
  };

  type Graph = Record<
    string,
    { class_type: string; inputs: Record<string, unknown> }
  >;

  it('builds the LTX-2.5 two-stage i2v graph with separate loaders', () => {
    const wf = buildLtx25VideoWorkflow(base) as Graph;
    expect(wf.unet.class_type).toBe('UNETLoader');
    expect(wf.vae_v.class_type).toBe('VAELoader');
    expect(wf.vae_a.class_type).toBe('VAELoader');
    expect(wf.clip.class_type).toBe('CLIPLoader');
    expect(wf.clip.inputs.type).toBe('ltxv');
    expect(wf.upscaler.class_type).toBe('LatentUpscaleModelLoader');
  });

  it('feeds the start frame through LTXVPreprocess into both stages', () => {
    const wf = buildLtx25VideoWorkflow(base) as Graph;
    expect(wf.loadimg.class_type).toBe('LoadImage');
    expect(wf.loadimg.inputs.image).toBe('uploads/i2v-source.png');
    expect(wf.pre.inputs.image).toEqual(['loadimg', 0]);
    expect(wf.base_i2v.inputs.image).toEqual(['pre', 0]);
    expect(wf.ref_i2v.inputs.image).toEqual(['pre', 0]);
  });

  it('renders the base latent at half resolution and upscales in stage B', () => {
    const wf = buildLtx25VideoWorkflow(base) as Graph;
    expect(wf.base_latent.inputs.width).toBe(640);
    expect(wf.base_latent.inputs.height).toBe(352);
    expect(wf.up.class_type).toBe('LTXVLatentUpsampler');
    expect(wf.up.inputs.samples).toEqual(['base_sep', 0]);
    expect(wf.ref_i2v.inputs.latent).toEqual(['up', 0]);
  });

  it('keeps the distilled dual-CFG + manual sigma schedule intact', () => {
    const wf = buildLtx25VideoWorkflow(base) as Graph;
    expect(wf.base_guider.class_type).toBe('LTXVDualCFGGuider');
    expect(wf.ref_guider.class_type).toBe('LTXVDualCFGGuider');
    expect(wf.base_sigmas.class_type).toBe('ManualSigmas');
    expect(wf.ref_sigmas.class_type).toBe('ManualSigmas');
    expect(wf.base_sample.inputs.sigmas).toEqual(['base_sigmas', 0]);
    expect(wf.ref_sample.inputs.sigmas).toEqual(['ref_sigmas', 0]);
  });

  it('muxes decoded audio + video and saves an mp4', () => {
    const wf = buildLtx25VideoWorkflow(base) as Graph;
    expect(wf.decode.class_type).toBe('VAEDecodeTiled');
    expect(wf.audio_decode.class_type).toBe('LTXVAudioVAEDecode');
    expect(wf.video.inputs.images).toEqual(['decode', 0]);
    expect(wf.video.inputs.audio).toEqual(['audio_decode', 0]);
    expect(wf.save.class_type).toBe('SaveVideo');
    expect(wf.save.inputs.format).toBe('mp4');
  });

  it('snaps dimensions to multiples of 64 and frames to 8k+1', () => {
    const wf = buildLtx25VideoWorkflow({
      ...base,
      width: 1000,
      height: 700,
    }) as Graph;
    // 1000 -> 1024, 700 -> 704; half of each must be 32-aligned
    expect((wf.base_latent.inputs.width as number) % 32).toBe(0);
    expect((wf.base_latent.inputs.height as number) % 32).toBe(0);
    expect(snapLtx25Frames(121)).toBe(121);
    expect((snapLtx25Frames(120) - 9) % 8).toBe(0);
  });
});
