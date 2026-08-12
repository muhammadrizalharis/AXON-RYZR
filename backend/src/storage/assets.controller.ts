import { Controller, Get, NotFoundException, Req, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { StorageService } from './storage.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * Public streaming proxy for stored assets. Lets browsers load generated
 * images/videos through the API (the only publicly exposed port) without
 * exposing MinIO directly. Object keys embed random UUIDs, so they are
 * effectively unguessable (same security model as presigned URLs).
 */
@ApiExcludeController()
@SkipThrottle()
@Controller('assets')
export class AssetsController {
  constructor(private readonly storage: StorageService) {}

  @Public()
  @Get('*')
  async serve(@Req() req: Request, @Res() res: Response): Promise<void> {
    const key = req.params[0];
    if (!key) {
      throw new NotFoundException('Asset not found');
    }

    let stat;
    try {
      stat = await this.storage.statObject(key);
    } catch {
      throw new NotFoundException('Asset not found');
    }

    const contentType =
      (stat.metaData && stat.metaData['content-type']) ||
      'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Accept-Ranges', 'bytes');

    // Range support so <video>/<audio> can seek without full download.
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
    if (range && (range[1] || range[2])) {
      const start = range[1] ? parseInt(range[1], 10) : 0;
      const end = range[2]
        ? Math.min(parseInt(range[2], 10), stat.size - 1)
        : stat.size - 1;
      if (start >= stat.size || start > end) {
        res.status(416).setHeader('Content-Range', `bytes */${stat.size}`);
        res.end();
        return;
      }
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Content-Length', String(end - start + 1));
      const partial = await this.storage.getPartialObjectStream(
        key,
        start,
        end - start + 1,
      );
      partial.on('error', () => {
        if (!res.headersSent) res.status(404);
        res.end();
      });
      partial.pipe(res);
      return;
    }

    res.setHeader('Content-Length', String(stat.size));

    const stream = await this.storage.getObjectStream(key);
    stream.on('error', () => {
      if (!res.headersSent) res.status(404);
      res.end();
    });
    stream.pipe(res);
  }
}
