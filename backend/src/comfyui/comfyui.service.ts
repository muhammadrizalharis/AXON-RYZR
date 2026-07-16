import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import { ComfyuiConfig } from '../config/configuration';

export interface ComfyOutputFile {
  filename: string;
  subfolder: string;
  type: string; // "output" | "temp"
  buffer: Buffer;
  mimeType: string;
}

export type ProgressCallback = (progress: number) => void | Promise<void>;

interface PromptResponse {
  prompt_id: string;
  number: number;
  node_errors: Record<string, unknown>;
}

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

@Injectable()
export class ComfyuiService {
  private readonly logger = new Logger(ComfyuiService.name);
  private readonly http: AxiosInstance;
  private readonly config: ComfyuiConfig;

  constructor(configService: ConfigService) {
    this.config = configService.getOrThrow<ComfyuiConfig>('comfyui');
    this.http = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30_000,
    });
  }

  /**
   * Submits a workflow and resolves with the produced output files once the
   * ComfyUI graph finishes executing. Progress (0-100) is streamed via the
   * optional callback using the ComfyUI WebSocket channel.
   */
  async runWorkflow(
    workflow: Record<string, unknown>,
    onProgress?: ProgressCallback,
  ): Promise<ComfyOutputFile[]> {
    const clientId = randomUUID();
    const promptId = await this.submitPrompt(workflow, clientId);
    await this.waitForCompletion(promptId, clientId, onProgress);
    return this.collectOutputs(promptId);
  }

  async health(): Promise<boolean> {
    try {
      await this.http.get('/system_stats', { timeout: 5_000 });
      return true;
    } catch {
      return false;
    }
  }

  private async submitPrompt(
    workflow: Record<string, unknown>,
    clientId: string,
  ): Promise<string> {
    try {
      const { data } = await this.http.post<PromptResponse>('/prompt', {
        prompt: workflow,
        client_id: clientId,
      });
      if (!data?.prompt_id) {
        throw new Error('ComfyUI did not return a prompt_id');
      }
      this.logger.debug(`Submitted ComfyUI prompt ${data.prompt_id}`);
      return data.prompt_id;
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response
          ? JSON.stringify(err.response.data)
          : (err as Error).message;
      throw new ServiceUnavailableException(
        `Failed to submit workflow to ComfyUI: ${message}`,
      );
    }
  }

  /**
   * Opens the ComfyUI WebSocket and resolves when the target prompt finishes.
   * Falls back to HTTP history polling if the socket cannot be established.
   */
  private waitForCompletion(
    promptId: string,
    clientId: string,
    onProgress?: ProgressCallback,
  ): Promise<void> {
    const wsUrl =
      this.config.baseUrl.replace(/^http/, 'ws').replace(/\/$/, '') +
      `/ws?clientId=${clientId}`;

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      let ws: WebSocket;

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        ws?.terminate();
        reject(new ServiceUnavailableException('ComfyUI generation timed out'));
      }, this.config.timeoutMs);

      const finish = (err?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        ws?.close();
        err ? reject(err) : resolve();
      };

      try {
        ws = new WebSocket(wsUrl);
      } catch (err) {
        clearTimeout(timeout);
        // Fall back to polling.
        this.pollHistory(promptId)
          .then(() => finish())
          .catch(finish);
        return;
      }

      ws.on('message', (raw: WebSocket.RawData, isBinary: boolean) => {
        if (isBinary) return; // preview frames — ignored
        let msg: { type: string; data?: Record<string, unknown> };
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }

        const data = msg.data ?? {};
        if (data.prompt_id && data.prompt_id !== promptId) return;

        switch (msg.type) {
          case 'progress': {
            const value = Number(data.value ?? 0);
            const max = Number(data.max ?? 1) || 1;
            void onProgress?.(Math.round((value / max) * 100));
            break;
          }
          case 'executing': {
            // node === null signals the prompt has finished executing.
            if (data.node === null && data.prompt_id === promptId) {
              void onProgress?.(100);
              finish();
            }
            break;
          }
          case 'execution_error': {
            finish(
              new ServiceUnavailableException(
                `ComfyUI execution error: ${JSON.stringify(data)}`,
              ),
            );
            break;
          }
          default:
            break;
        }
      });

      ws.on('error', (err) => {
        this.logger.warn(`ComfyUI WS error, falling back to polling: ${err}`);
        clearTimeout(timeout);
        this.pollHistory(promptId)
          .then(() => finish())
          .catch(finish);
      });

      ws.on('close', () => {
        // If closed before completion without error, verify via history.
        if (!settled) {
          this.pollHistory(promptId)
            .then(() => finish())
            .catch(finish);
        }
      });
    });
  }

  /**
   * Polls /history/{promptId} until outputs are present (fallback path).
   */
  private async pollHistory(promptId: string): Promise<void> {
    const deadline = Date.now() + this.config.timeoutMs;
    while (Date.now() < deadline) {
      const history = await this.getHistory(promptId);
      if (history) return;
      await this.delay(this.config.pollIntervalMs);
    }
    throw new ServiceUnavailableException(
      'ComfyUI generation timed out (polling)',
    );
  }

  private async getHistory(
    promptId: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const { data } = await this.http.get<Record<string, unknown>>(
        `/history/${promptId}`,
      );
      const entry = data?.[promptId] as Record<string, unknown> | undefined;
      return entry ?? null;
    } catch {
      return null;
    }
  }

  private async collectOutputs(promptId: string): Promise<ComfyOutputFile[]> {
    const entry = await this.getHistory(promptId);
    if (!entry) {
      throw new ServiceUnavailableException(
        'ComfyUI produced no history for this prompt',
      );
    }

    const outputs = (entry.outputs ?? {}) as Record<
      string,
      Record<string, Array<Record<string, string>>>
    >;

    const files: ComfyOutputFile[] = [];
    for (const nodeOutput of Object.values(outputs)) {
      // ComfyUI groups outputs by key: images, gifs, videos, etc.
      for (const items of Object.values(nodeOutput)) {
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          if (!item?.filename) continue;
          const buffer = await this.downloadFile(
            item.filename,
            item.subfolder ?? '',
            item.type ?? 'output',
          );
          files.push({
            filename: item.filename,
            subfolder: item.subfolder ?? '',
            type: item.type ?? 'output',
            buffer,
            mimeType: this.mimeFor(item.filename),
          });
        }
      }
    }

    if (files.length === 0) {
      throw new ServiceUnavailableException(
        'ComfyUI finished but returned no output files',
      );
    }
    return files;
  }

  private async downloadFile(
    filename: string,
    subfolder: string,
    type: string,
  ): Promise<Buffer> {
    const { data } = await this.http.get<ArrayBuffer>('/view', {
      params: { filename, subfolder, type },
      responseType: 'arraybuffer',
      timeout: 120_000,
    });
    return Buffer.from(data);
  }

  private mimeFor(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    return MIME_BY_EXT[ext] ?? 'application/octet-stream';
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
