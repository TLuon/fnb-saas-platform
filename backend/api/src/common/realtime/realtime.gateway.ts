import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import { RoleApp } from '../types/auth.types.js';

interface SupabaseJwtPayload extends JWTPayload {
  role_app?: RoleApp;
  tenant_id?: string | null;
  branch_id?: string | null;
  email?: string;
}

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private jwks: ReturnType<typeof createRemoteJWKSet>;
  private issuer: string;

  constructor(private readonly configService: ConfigService) {}

  afterInit(server: Server) {
    const supabaseUrl = this.configService.get<string>('supabase.url') ?? '';
    this.issuer = this.configService.get<string>('supabase.jwtIssuer') ?? `${supabaseUrl}/auth/v1`;
    this.jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
    this.logger.log('RealtimeGateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const result = await jwtVerify(token, this.jwks, { issuer: this.issuer });
      const payload = result.payload as SupabaseJwtPayload;

      if (!payload.role_app || !payload.sub || !payload.tenant_id) {
        client.disconnect();
        return;
      }

      // Lưu trữ user info để có thể lấy ra trong các subscribeMessage nếu cần
      (client as any).user = {
        sub: payload.sub,
        role_app: payload.role_app,
        tenant_id: payload.tenant_id,
        branch_id: payload.branch_id,
      };

      // Room isolation: kds:{branch_id} (Dựa theo REALTIME_EVENTS.md)
      // KDS chỉ phục vụ staff/owner
      if ((payload.role_app === 'STAFF' || payload.role_app === 'OWNER') && payload.branch_id) {
        const kdsRoom = `kds:${payload.branch_id}`;
        client.join(kdsRoom);
        this.logger.log(`Client ${client.id} joined ${kdsRoom}`);
      }

      // Room: support:{tenant_id} — REALTIME_EVENTS.md mục 1
      if ((payload.role_app === 'SUPPORT' || payload.role_app === 'OWNER') && payload.tenant_id) {
        const supportRoom = `support:${payload.tenant_id}`;
        client.join(supportRoom);
        this.logger.log(`Client ${client.id} joined ${supportRoom}`);
      }
    } catch (err: any) {
      this.logger.error(`WebSocket Connection error: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth?.token || client.handshake.headers?.authorization;
    if (!auth) return null;
    const parts = auth.split(' ');
    return parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : auth;
  }

  // Event emitters called from business services
  emitKdsNewTicket(branchId: string, payload: any) {
    this.server.to(`kds:${branchId}`).emit('kds_new_ticket', payload);
  }

  emitKdsItemStatusChanged(branchId: string, payload: any) {
    this.server.to(`kds:${branchId}`).emit('kds_item_status_changed', payload);
  }

  /** REALTIME_EVENTS.md #2.6 — support_ticket_urgent_created */
  emitSupportTicketUrgent(tenantId: string, payload: any) {
    this.server.to(`support:${tenantId}`).emit('support_ticket_urgent_created', payload);
  }

  /** REALTIME_EVENTS.md #2.4 — group_order_cart_updated */
  emitGroupOrderCartUpdated(tenantId: string, tableId: string, payload: any) {
    this.server.to(`group_order:${tenantId}:${tableId}`).emit('group_order_cart_updated', payload);
  }
}
