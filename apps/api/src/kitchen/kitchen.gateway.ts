import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class KitchenGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    if (!token) {
      client.disconnect();
      return;
    }

    let branchId = client.handshake.query.branchId;
    if (branchId) {
      if (Array.isArray(branchId)) {
        branchId = branchId[0];
      }
      client.join(`kitchen:${branchId}`);
    }
  }

  handleDisconnect(client: Socket) {
    // Handle disconnect
  }

  emitToBranch(branchId: string, event: string, payload: any) {
    this.server.to(`kitchen:${branchId}`).emit(event, payload);
  }

  emitToRoom(room: string, event: string, payload: any) {
    this.server.to(room).emit(event, payload);
  }
}
