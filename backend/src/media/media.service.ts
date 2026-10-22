import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Thin ffmpeg wrapper for post-processing generated media. Currently used to
 * mux an audio track into a rendered (silent) video. Every path fails SOFT:
 * if ffmpeg is missing or the mux fails, callers keep the original video so a
 * generation is never lost just because music could not be attached.
 */
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  /**
   * Muxes `audio` into `video`, re-encoding only the audio (AAC) and copying
   * the video stream. The result is trimmed to the shorter of the two inputs
   * so trailing silence / dangling video is avoided. Returns the combined MP4
   * buffer, or null on any failure.
   */
  async muxAudioIntoVideo(
    video: Buffer,
    videoName: string,
    audio: Buffer,
    audioName: string,
  ): Promise<Buffer | null> {
    const vExt = this.ext(videoName, 'mp4');
    const aExt = this.ext(audioName, 'mp3');
    let dir: string | undefined;
    try {
      dir = await mkdtemp(join(tmpdir(), 'axon-mux-'));
      const vPath = join(dir, `in.${vExt}`);
      const aPath = join(dir, `in.${aExt}`);
      const outPath = join(dir, 'out.mp4');
      await writeFile(vPath, video);
      await writeFile(aPath, audio);
      const ok = await this.runFfmpeg([
        '-y',
        '-i',
        vPath,
        '-i',
        aPath,
        '-map',
        '0:v:0',
        '-map',
        '1:a:0',
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-shortest',
        '-movflags',
        '+faststart',
        outPath,
      ]);
      if (!ok) return null;
      return await readFile(outPath);
    } catch (err) {
      this.logger.warn(`Audio mux failed: ${(err as Error).message}`);
      return null;
    } finally {
      if (dir) {
        await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  }

  private ext(filename: string, fallback: string): string {
    return filename.split('.').pop()?.toLowerCase() || fallback;
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
      const kill = setTimeout(() => proc.kill('SIGKILL'), 120_000);
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
}
