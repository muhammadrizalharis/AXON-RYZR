import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtConfig } from '../config/configuration';
import { JwtPayload } from '../auth/auth.types';

export interface JobEventPayload {
  jobId: string;
  status: string;
  progress: number;
  type?: string;
  error?: string | null;
  assets?: Array<{ id: string; url: string; type: string }>;
}

const userRoom = (userId: string) => `user:${userId}`;

@WebSocketGateway({
  namespace: '/socket',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect(true);
        return;
      }
      const { accessSecret } = this.config.getOrThrow<JwtConfig>('jwt');
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: accessSecret,
      });

      client.data.userId = payload.sub;
      await client.join(userRoom(payload.sub));
      this.logger.debug(`Socket connected: user=${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data?.userId;
    if (userId) {
      this.logger.debug(`Socket disconnected: user=${userId}`);
    }
  }

  /**
   * Pushes a job lifecycle/progress event to the owning user's room.
   */
  emitJobUpdate(userId: string, payload: JobEventPayload): void {
    if (!this.server) return;
    this.server.to(userRoom(userId)).emit('job:update', payload);
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth?.token as string | undefined;
    if (auth) return auth.replace(/^Bearer\s+/i, '');

    const header = client.handshake.headers?.authorization;
    if (header) return header.replace(/^Bearer\s+/i, '');

    const query = client.handshake.query?.token;
    if (typeof query === 'string') return query;

    return null;
  }
}
