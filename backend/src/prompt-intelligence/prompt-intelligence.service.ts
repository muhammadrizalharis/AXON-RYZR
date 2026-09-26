import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OllamaConfig } from '../config/configuration';
import {
  IMAGE_SYSTEM_PROMPT,
  VIDEO_SYSTEM_PROMPT,
} from './prompt-intelligence.prompts';

export type PromptKind = 'image' | 'video';

export interface EnhanceContext {
  style?: string;
  aspectRatio?: string;
}

export interface EnhanceResult {
  text: string;
  enhanced: boolean;
}

/**
 * Turns a short user brief into a professional generation prompt using the local
 * Ollama LLM as an inference-only "brain". Any failure (disabled, timeout, HTTP
 * error, dropped literal) falls back to the original prompt so generation never
 * breaks. Ollama itself is never trained or modified.
 */
@Injectable()
export class PromptIntelligenceService {
  private readonly logger = new Logger(PromptIntelligenceService.name);
  private readonly cfg: OllamaConfig;

  constructor(config: ConfigService) {
    this.cfg = config.getOrThrow<OllamaConfig>('ollama');
  }

  async enhance(
    input: string,
    kind: PromptKind,
    ctx: EnhanceContext = {},
  ): Promise<EnhanceResult> {
    const original = (input ?? '').trim();
    if (!this.cfg.enabled || original.length < 3) {
      return { text: original, enhanced: false };
    }

    const system = kind === 'video' ? VIDEO_SYSTEM_PROMPT : IMAGE_SYSTEM_PROMPT;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
    try {
      const res = await fetch(`${this.cfg.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: this.cfg.model,
          stream: false,
          options: { temperature: 0.6, top_p: 0.9 },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: this.buildUserMessage(original, ctx) },
          ],
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        this.logger.warn(`Ollama HTTP ${res.status} — using original prompt`);
        return { text: original, enhanced: false };
      }
      const data = (await res.json()) as { message?: { content?: string } };
      const cleaned = this.clean(data?.message?.content ?? '');
      if (cleaned.length < original.length) {
        return { text: original, enhanced: false };
      }
      if (!this.preservesLiterals(original, cleaned)) {
        this.logger.warn('Enhanced prompt dropped a literal — falling back');
        return { text: original, enhanced: false };
      }
      return { text: cleaned.slice(0, 8000), enhanced: true };
    } catch (err) {
      this.logger.warn(
        `Prompt enhance failed (${(err as Error).name}) — using original`,
      );
      return { text: original, enhanced: false };
    } finally {
      clearTimeout(timer);
    }
  }

  private buildUserMessage(input: string, ctx: EnhanceContext): string {
    const hints: string[] = [];
    if (ctx.style && ctx.style !== 'none') hints.push(`preferred style: ${ctx.style}`);
    if (ctx.aspectRatio) hints.push(`aspect ratio: ${ctx.aspectRatio}`);
    const hintLine = hints.length ? `\n[hints] ${hints.join('; ')}` : '';
    return `User brief:\n${input}${hintLine}\n\nReturn ONLY the final prompt.`;
  }

  private clean(raw: string): string {
    let t = (raw ?? '').trim();
    t = t.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '').trim();
    t = t
      .replace(/^(here(?:'| i)s[^:]*|final prompt|prompt|enhanced prompt)\s*[:\-–]\s*/i, '')
      .trim();
    if (
      (t.startsWith('"') && t.endsWith('"')) ||
      (t.startsWith('“') && t.endsWith('”'))
    ) {
      t = t.slice(1, -1).trim();
    }
    return t.replace(/\n{3,}/g, '\n\n').trim();
  }

  /** Zero-tolerance safety: every digit run and quoted phrase in the input must survive. */
  private preservesLiterals(input: string, output: string): boolean {
    const out = output.toLowerCase();
    for (const d of input.match(/\d[\d.,:/-]*\d|\d/g) ?? []) {
      if (!output.includes(d)) return false;
    }
    for (const q of input.match(/"[^"]{1,80}"|'[^']{1,80}'/g) ?? []) {
      const inner = q.slice(1, -1).toLowerCase().trim();
      if (inner && !out.includes(inner)) return false;
    }
    return true;
  }
}
