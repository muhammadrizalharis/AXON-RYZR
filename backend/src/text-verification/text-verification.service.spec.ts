import { ConfigService } from '@nestjs/config';
import { TextVerificationService } from './text-verification.service';
import { OllamaConfig, TextVerifyConfig } from '../config/configuration';

function makeService(overrides?: {
  ollama?: Partial<OllamaConfig>;
  textVerify?: Partial<TextVerifyConfig>;
}): TextVerificationService {
  const ollama: OllamaConfig = {
    enabled: true,
    baseUrl: 'http://127.0.0.1:11434',
    model: 'qwen2.5:7b-instruct',
    timeoutMs: 30_000,
    ...overrides?.ollama,
  } as OllamaConfig;
  const textVerify: TextVerifyConfig = {
    enabled: false,
    model: 'qwen2.5vl:latest',
    maxAttempts: 1,
    ocrTimeoutMs: 240_000,
    keepAlive: '10m',
    ...overrides?.textVerify,
  } as TextVerifyConfig;

  const config = {
    getOrThrow: (key: string) => {
      if (key === 'ollama') return ollama;
      if (key === 'textVerify') return textVerify;
      throw new Error(`unexpected config key ${key}`);
    },
  } as unknown as ConfigService;

  return new TextVerificationService(config);
}

describe('TextVerificationService', () => {
  describe('getters', () => {
    it('exposes the global opt-in default from config', () => {
      expect(makeService().defaultEnabled).toBe(false);
      expect(
        makeService({ textVerify: { enabled: true } }).defaultEnabled,
      ).toBe(true);
    });

    it('clamps maxAttempts to a non-negative integer', () => {
      expect(makeService({ textVerify: { maxAttempts: 2 } }).maxAttempts).toBe(
        2,
      );
      expect(makeService({ textVerify: { maxAttempts: -5 } }).maxAttempts).toBe(
        0,
      );
    });

    it('is only available when the local LLM is enabled', () => {
      expect(makeService().available).toBe(true);
      expect(makeService({ ollama: { enabled: false } }).available).toBe(false);
    });
  });

  describe('extractRequiredText (quoted path)', () => {
    it('pulls double-quoted literals from the enhanced prompt', async () => {
      const svc = makeService();
      const out = await svc.extractRequiredText(
        'poster brief',
        'A bold poster that says "OPEN PRE-ORDER" and "110K"',
      );
      expect(out).toEqual(['OPEN PRE-ORDER', '110K']);
    });

    it('supports single and curly quotes and dedupes case-insensitively', async () => {
      const svc = makeService();
      const out = await svc.extractRequiredText(
        "headline 'Sale'",
        'banner \u201CSale\u201D and again "SALE"',
      );
      expect(out).toEqual(['SALE']);
    });

    it('returns [] without hitting the LLM when there is no text to render', async () => {
      const svc = makeService({ ollama: { enabled: false } });
      const out = await svc.extractRequiredText('a cat on a sofa', 'a cat');
      expect(out).toEqual([]);
    });
  });

  describe('scoreText', () => {
    it('passes when every literal is present (ignoring case/punctuation)', () => {
      const svc = makeService();
      const score = svc.scoreText(
        ['OPEN PRE-ORDER', '110K'],
        'open pre order\n110k\nhmif t-shirt',
      );
      expect(score.ok).toBe(true);
      expect(score.missing).toEqual([]);
    });

    it('flags literals missing or misspelled in the OCR transcript', () => {
      const svc = makeService();
      const score = svc.scoreText(
        ['SEPTEMBER', 'DISCOUNT'],
        'SEPTEMER sale\n50 percent off',
      );
      expect(score.ok).toBe(false);
      expect(score.missing).toEqual(['SEPTEMBER', 'DISCOUNT']);
    });
  });

  describe('reinforce', () => {
    it('appends an explicit exact-text instruction listing the literals', () => {
      const svc = makeService();
      const out = svc.reinforce('a festival poster', ['SUMMER FEST', '2026']);
      expect(out).toContain('a festival poster');
      expect(out).toContain('CRITICAL TEXT ACCURACY');
      expect(out).toContain('"SUMMER FEST", "2026"');
    });
  });
});
