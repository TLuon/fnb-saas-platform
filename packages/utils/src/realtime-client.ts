import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Socket } from 'socket.io-client';

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

  private config: RealtimeClientConfig;

  constructor(config: RealtimeClientConfig) {
    this.config = config;
    this.supabase = createClient(
      config.supabaseUrl || 'https://dummy.supabase.co', 
      config.supabaseKey || 'dummy-key'
    );
    // Initialize socket as undefined, will be connected dynamically
    this.socket = null as any;
  }

  async connect() {
    if (this.socket) return;
    const { io } = await import('socket.io-client');
    this.socket = io(this.config.socketUrl, {
      autoConnect: true,
      ...(this.config.token ? { auth: { token: `Bearer ${this.config.token}` } } : {})
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.supabase.removeAllChannels();
  }
}

