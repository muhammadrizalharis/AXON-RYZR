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

    res.setHeader(
      'Content-Type',
      (stat.metaData && stat.metaData['content-type']) ||
        'application/octet-stream',
    );
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const stream = await this.storage.getObjectStream(key);
    stream.on('error', () => {
      if (!res.headersSent) res.status(404);
      res.end();
    });
    stream.pipe(res);
  }
}
