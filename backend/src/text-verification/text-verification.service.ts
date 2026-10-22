import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { OllamaConfig, TextVerifyConfig } from '../config/configuration';

export interface TextScore {
  /** Required literals NOT found in the rendered output. */
  missing: string[];
  /** True when every required literal was rendered correctly. */
  ok: boolean;
}

/**
 * Fase 3 — "Text Accuracy". Reads the text actually rendered on an image (or a
 * video frame) with a local vision model (qwen2.5vl) and checks it against the
 * literal text the user asked for. Used purely as inference — no model is
 * trained or modified. Every path fails SOFT: if anything is unavailable or
 * slow, callers keep the current render so generation is never broken.
 */
@Injectable()
export class TextVerificationService {
  private readonly logger = new Logger(TextVerificationService.name);
  private readonly ollama: OllamaConfig;
  private readonly cfg: TextVerifyConfig;

  constructor(config: ConfigService) {
    this.ollama = config.getOrThrow<OllamaConfig>('ollama');
    this.cfg = config.getOrThrow<TextVerifyConfig>('textVerify');
  }

  /** Global default when a request omits the per-job flag (opt-in: off). */
  get defaultEnabled(): boolean {
    return this.cfg.enabled;
  }

  /** Extra re-renders allowed beyond the first render. */
  get maxAttempts(): number {
    return Math.max(0, this.cfg.maxAttempts);
  }

  /** Verification is only possible when the local LLM brain is reachable. */
  get available(): boolean {
    return this.ollama.enabled;
  }

  /**
   * Determines the literal text the user wants ON the output. Cheap path first:
   * quoted phrases in the (enhanced) prompt — the enhancer is instructed to
   * double-quote required on-image text. Falls back to a single LLM extraction
   * from the raw brief. Returns [] when the user asked for no on-image text
   * (so verification is skipped entirely — no GPU cost).
   */
  async extractRequiredText(
    originalPrompt: string,
    enhancedPrompt: string,
  ): Promise<string[]> {
    const quoted = this.collectQuoted(`${enhancedPrompt}\n${originalPrompt}`);
    if (quoted.length) return this.dedupe(quoted);

    const brief = (originalPrompt ?? '').trim();
    if (!this.ollama.enabled || brief.length < 3) return [];
    return this.llmExtract(brief);
  }

  /**
   * Reads all visible text in an image buffer via the vision model. Returns the
   * raw text (newline-separated) or null on any failure/timeout.
   */
  async readImageText(image: Buffer): Promise<string | null> {
    if (!this.ollama.enabled) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.cfg.ocrTimeoutMs);
    try {
      const res = await fetch(`${this.ollama.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: this.cfg.model,
          stream: false,
          keep_alive: this.cfg.keepAlive,
          options: { temperature: 0 },
          messages: [
            {
              role: 'user',
              content:
                'Transcribe every piece of text visible in this image EXACTLY ' +
                'as written, one item per line. Preserve spelling, case, digits ' +
                'and punctuation. If there is no text, reply with "NONE". Output ' +
                'only the text — no commentary.',
              images: [image.toString('base64')],
            },
          ],
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        this.logger.warn(`Vision OCR HTTP ${res.status} — skipping verify`);
        return null;
      }
      const data = (await res.json()) as { message?: { content?: string } };
      return (data?.message?.content ?? '').trim();
    } catch (err) {
      this.logger.warn(
        `Vision OCR failed (${(err as Error).name}) — skipping verify`,
      );
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Compares required literals against the OCR transcript (normalized). */
  scoreText(required: string[], ocrText: string): TextScore {
    const haystack = this.normalize(ocrText);
    const missing = required.filter(
      (lit) => !haystack.includes(this.normalize(lit)),
    );
    return { missing, ok: missing.length === 0 };
  }

  /** Appends a strong, explicit text-accuracy instruction for a re-render. */
  reinforce(prompt: string, required: string[]): string {
    const list = required.map((t) => `"${t}"`).join(', ');
    return (
      `${prompt}\n\nCRITICAL TEXT ACCURACY: the output MUST display these exact ` +
      `words, spelled correctly, large, bold and clearly legible: ${list}. ` +
      `Do not misspell them, do not translate them, and do not add any other text.`
    );
  }

  /**
   * Extracts a representative still frame from a video buffer using ffmpeg so
   * it can be OCR-checked. Returns a PNG buffer, or null if ffmpeg is missing
   * or extraction fails (verification is then skipped for that job).
   */
  async extractVideoFrame(
    video: Buffer,
    filename: string,
  ): Promise<Buffer | null> {
    const ext = filename.split('.').pop()?.toLowerCase() || 'mp4';
    let dir: string | undefined;
    try {
      dir = await mkdtemp(join(tmpdir(), 'axon-ocr-'));
      const inPath = join(dir, `in.${ext}`);
      const outPath = join(dir, 'frame.png');
      await writeFile(inPath, video);
      // Grab a frame ~1s in (skips an often-blank first frame); fall back to 0.
      const ok = await this.runFfmpeg([
        '-y',
        '-ss',
        '1',
        '-i',
        inPath,
        '-frames:v',
        '1',
        '-q:v',
        '2',
        outPath,
      ]);
      const finalOk = ok
        ? true
        : await this.runFfmpeg([
            '-y',
            '-i',
            inPath,
            '-frames:v',
            '1',
            '-q:v',
            '2',
            outPath,
          ]);
      if (!finalOk) return null;
      return await readFile(outPath);
    } catch (err) {
      this.logger.warn(
        `Video frame extraction failed: ${(err as Error).message}`,
      );
      return null;
    } finally {
      if (dir) {
        await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  }

  private runFfmpeg(args: string[]): Promise<boolean> {
    return new Promise((resolve) => {
      let proc: ReturnType<typeof spawn>;
      try {
        proc = spawn('ffmpeg', args, { stdio: 'ignore' });
      } catch {
        resolve(false);
        return;
      }
      const kill = setTimeout(() => proc.kill('SIGKILL'), 30_000);
      proc.on('error', () => {
        clearTimeout(kill);
        resolve(false);
      });
      proc.on('close', (code) => {
        clearTimeout(kill);
        resolve(code === 0);
      });
    });
  }

  private async llmExtract(brief: string): Promise<string[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.ollama.timeoutMs);
    try {
      const res = await fetch(`${this.ollama.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: this.ollama.model,
          stream: false,
          format: 'json',
          options: { temperature: 0 },
          messages: [
            {
              role: 'system',
              content:
                'You extract the exact literal text the user wants printed ON a ' +
                'generated image/poster/video (headlines, prices, dates, names, ' +
                'slogans). Reply with ONLY a JSON object {"text": string[]} where ' +
                'each item is a verbatim string to render. If the user asked for ' +
                'no on-image text, reply {"text": []}. Never translate or invent.',
            },
            { role: 'user', content: brief },
          ],
        }),
        signal: controller.signal,
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { message?: { content?: string } };
      const parsed = JSON.parse(data?.message?.content ?? '{}') as {
        text?: unknown;
      };
      if (!Array.isArray(parsed.text)) return [];
      const items = parsed.text
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.length <= 120);
      return this.dedupe(items);
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  private collectQuoted(text: string): string[] {
    const out: string[] = [];
    const patterns = [
      /"([^"]{1,120})"/g,
      /'([^']{1,120})'/g,
      /[\u201C\u201D]([^\u201C\u201D]{1,120})[\u201C\u201D]/g,
    ];
    for (const re of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        const inner = m[1].trim();
        if (inner.length >= 2) out.push(inner);
      }
    }
    return out;
  }

  private normalize(s: string): string {
    return (s ?? '')
      .toUpperCase()
      .replace(/[^0-9A-Z\u00C0-\u024F]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private dedupe(items: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const it of items) {
      const key = this.normalize(it);
      if (key && !seen.has(key)) {
        seen.add(key);
        out.push(it);
      }
    }
    return out;
  }
}
