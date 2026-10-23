import { buildTextToImageWorkflow } from './text-to-image.workflow';

type Node = { class_type: string; inputs: Record<string, unknown> };

describe('buildTextToImageWorkflow', () => {
  const base = {
    prompt: 'a portrait of a man',
    width: 768,
    height: 1024,
    steps: 20,
    seed: 42,
  };

  it('builds a plain FLUX.2 text-to-image graph without a reference', () => {
    const g = buildTextToImageWorkflow(base) as Record<string, Node>;
    expect(g.unet.class_type).toBe('UNETLoader');
    expect(g.referencelatent).toBeUndefined();
    expect(g.loadref).toBeUndefined();
    // FluxGuidance consumes the plain positive conditioning.
    expect(g.fluxguidance.inputs.conditioning).toEqual(['positive', 0]);
  });

  it('injects ReferenceLatent for character lock when a reference is set', () => {
    const g = buildTextToImageWorkflow({
      ...base,
      referenceImageName: 'character-ref.png',
    }) as Record<string, Node>;

    expect(g.loadref.class_type).toBe('LoadImage');
    expect(g.loadref.inputs.image).toBe('character-ref.png');
    expect(g.encoderef.class_type).toBe('VAEEncode');
    expect(g.encoderef.inputs.pixels).toEqual(['loadref', 0]);
    expect(g.referencelatent.class_type).toBe('ReferenceLatent');
    expect(g.referencelatent.inputs.conditioning).toEqual(['positive', 0]);
    expect(g.referencelatent.inputs.latent).toEqual(['encoderef', 0]);
    // FluxGuidance now consumes the reference-wrapped conditioning.
    expect(g.fluxguidance.inputs.conditioning).toEqual(['referencelatent', 0]);
  });
});
