import {
  buildTextToVideoWorkflow,
  snapWanFrames,
} from './text-to-video.workflow';

describe('buildTextToVideoWorkflow', () => {
  const base = {
    prompt: 'a serene lake',
    width: 1280,
    height: 704,
    steps: 25,
    cfg: 5,
    seed: 42,
    frames: 81,
    fps: 24,
  };

  it('builds a pure text-to-video graph without a start image', () => {
    const wf = buildTextToVideoWorkflow(base) as Record<
      string,
      { class_type: string; inputs: Record<string, unknown> }
    >;
    expect(wf.load_image).toBeUndefined();
    expect(wf.latent.class_type).toBe('Wan22ImageToVideoLatent');
    expect(wf.latent.inputs.start_image).toBeUndefined();
  });

  it('wires a LoadImage node into the latent for image-to-video', () => {
    const wf = buildTextToVideoWorkflow({
      ...base,
      startImageName: 'uploads/i2v-source.png',
    }) as Record<
      string,
      { class_type: string; inputs: Record<string, unknown> }
    >;
    expect(wf.load_image.class_type).toBe('LoadImage');
    expect(wf.load_image.inputs.image).toBe('uploads/i2v-source.png');
    expect(wf.latent.inputs.start_image).toEqual(['load_image', 0]);
  });

  it('snaps frame counts to the Wan 4k+1 constraint', () => {
    expect(snapWanFrames(80)).toBe(81);
    expect(snapWanFrames(1)).toBe(5);
    expect((snapWanFrames(100) - 1) % 4).toBe(0);
  });
});
