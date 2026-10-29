import { Injectable, Logger } from '@nestjs/common';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { DEFAULT_VOICE_ID, isAllowedVoice } from '../generation/voice.presets';

export interface TtsResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

export interface TtsOptions {
  /** Edge-TTS voice id, e.g. "id-ID-ArdiNeural". */
  voice?: string;
  /** Speaking rate multiplier (0.5 … 1.5). Default 1. */
  rate?: number;
  /** Pitch shift in Hz (-50 … 50). Default 0. */
  pitch?: number;
  /** Filename prefix for the produced mp3. */
  prefix?: string;
}

/**
 * Text-to-speech via Microsoft Edge neural voices (msedge-tts). Free, no GPU,
 * no model download — synthesis happens over a websocket to the Edge TTS
 * endpoint and returns an MP3 buffer. Used by the "Generate Voice" feature.
 */
@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);

  /** Synthesizes `text` into an MP3 buffer with the requested voice/prosody. */
  async synthesize(text: string, options: TtsOptions = {}): Promise<TtsResult> {
    const voice =
      options.voice && isAllowedVoice(options.voice)
        ? options.voice
        : DEFAULT_VOICE_ID;
    const rate = this.clamp(options.rate ?? 1, 0.5, 1.5);
    const pitchHz = Math.round(this.clamp(options.pitch ?? 0, -50, 50));
    const pitch = `${pitchHz >= 0 ? '+' : ''}${pitchHz}Hz`;

    const tts = new MsEdgeTTS();
    await tts.setMetadata(
      voice,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
    );

    const { audioStream } = await tts.toStream(this.sanitize(text), {
      rate,
      pitch,
      volume: 100,
    });

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      audioStream.on('end', () => resolve());
      audioStream.on('error', (err: Error) => reject(err));
    });

    const buffer = Buffer.concat(chunks);
    if (buffer.length === 0) {
      throw new Error('TTS produced an empty audio stream');
    }

    this.logger.log(
      `Synthesized ${buffer.length} bytes of speech (${voice}, rate ${rate})`,
    );

    const prefix = options.prefix ?? 'AXON_VOICE';
    return {
      buffer,
      filename: `${prefix}_${Date.now()}.mp3`,
      mimeType: 'audio/mpeg',
    };
  }

  /** Strips SSML/markup-breaking characters so the plain text is safe. */
  private sanitize(text: string): string {
    return text.replace(/[<>]/g, ' ').trim();
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
