import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { io, Socket } from 'socket.io-client';

export interface RealtimeClientConfig {
  supabaseUrl: string;
  supabaseKey: string;
  socketUrl: string;
  /** JWT token for Socket.IO auth handshake */
  token?: string;
}

export class RealtimeClient {
  public supabase: SupabaseClient;
  public socket: Socket;

  constructor(config: RealtimeClientConfig) {
    this.supabase = createClient(
      config.supabaseUrl || 'https://dummy.supabase.co', 
      config.supabaseKey || 'dummy-key'
    );
    this.socket = io(config.socketUrl, {
      autoConnect: false,
      ...(config.token ? { auth: { token: `Bearer ${config.token}` } } : {})
    });
  }

  connect() {
    this.socket.connect();
  }

  disconnect() {
    this.socket.disconnect();
    this.supabase.removeAllChannels();
  }
}

