import {
  AspectRatio,
  applyStyle,
  GenerationStyle,
  ImageResolution,
  resolveDimensions,
} from './generation.presets';

describe('generation.presets', () => {
  describe('resolveDimensions', () => {
    it('returns square dimensions as multiples of 64', () => {
      const { width, height } = resolveDimensions(
        AspectRatio.SQUARE,
        ImageResolution.FHD,
      );
      expect(width % 64).toBe(0);
      expect(height % 64).toBe(0);
      expect(width).toBe(height);
    });

    it('produces a landscape wider than tall for 16:9', () => {
      const { width, height } = resolveDimensions(
        AspectRatio.LANDSCAPE_16_9,
        ImageResolution.HD,
      );
      expect(width).toBeGreaterThan(height);
    });

    it('caps the long edge to the provided maximum', () => {
      const { width, height } = resolveDimensions(
        AspectRatio.LANDSCAPE_16_9,
        ImageResolution.QHD,
        1024,
      );
      expect(Math.max(width, height)).toBeLessThanOrEqual(1024);
    });
  });

  describe('applyStyle', () => {
    it('returns the trimmed prompt unchanged for NONE', () => {
      expect(applyStyle('  a cat  ', GenerationStyle.NONE)).toBe('a cat');
    });

    it('appends style keywords for a concrete style', () => {
      const result = applyStyle('a cat', GenerationStyle.ANIME);
      expect(result.startsWith('a cat, ')).toBe(true);
      expect(result.length).toBeGreaterThan('a cat, '.length);
    });
  });
});
