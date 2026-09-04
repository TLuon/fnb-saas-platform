import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
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

  afterInit(_server: Server) {
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

  /**
   * ISSUE 2 FIX — join_group_order handler (server-side)
   *
   * Client emit: socket.emit('join_group_order', { table_id: '<uuid>' })
   * Server xác minh:
   *   1. Socket đã xác thực JWT (client.user được set trong handleConnection)
   *   2. tenant_id lấy từ JWT — không tin payload client gửi
   *   3. Client chỉ được join room thuộc tenant của mình
   *
   * Room name khớp chính xác với emitGroupOrderCartUpdated: group_order:{tenantId}:{tableId}
   */
  @SubscribeMessage('join_group_order')
  async handleJoinGroupOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { table_id: string }
  ) {
    const user = (client as any).user;

    // Guard: socket phải đã xác thực (handleConnection set user)
    if (!user || !user.tenant_id) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const tableId = data?.table_id;
    if (!tableId || typeof tableId !== 'string') {
      client.emit('error', { message: 'table_id is required' });
      return;
    }

    // tenant_id lấy từ JWT claim — client không thể inject tenant khác
    const room = `group_order:${user.tenant_id}:${tableId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined group order room ${room}`);

    client.emit('joined_group_order', { room, table_id: tableId });
  }

  /**
   * leave_group_order — cleanup khi client rời khỏi phòng nhóm chủ động
   */
  @SubscribeMessage('leave_group_order')
  handleLeaveGroupOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { table_id: string }
  ) {
    const user = (client as any).user;

    if (!user || !user.tenant_id) return;

    const tableId = data?.table_id;
    if (!tableId || typeof tableId !== 'string') return;

    const room = `group_order:${user.tenant_id}:${tableId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} left group order room ${room}`);
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
