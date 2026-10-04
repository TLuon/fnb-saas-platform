import { describe, it, expect } from 'vitest';
import { RealtimeClient } from './realtime-client';

describe('RealtimeClient', () => {
  it('should initialize without crashing', () => {
    const client = new RealtimeClient({
      supabaseUrl: 'https://test.supabase.co',
      supabaseKey: 'test-key',
      socketUrl: 'http://localhost:3000'
    });
    
    expect(client).toBeDefined();
  });

  it('should pass token to socket auth handshake when provided', () => {
    const client = new RealtimeClient({
      supabaseUrl: 'https://test.supabase.co',
      supabaseKey: 'test-key',
      socketUrl: 'http://localhost:3000',
      token: 'my-jwt-token'
    });
    
    // Socket.IO stores auth in socket.auth
    expect((client.socket as any).auth).toEqual({ token: 'Bearer my-jwt-token' });
  });

  it('should work without token (backwards compatible)', () => {
    const client = new RealtimeClient({
      supabaseUrl: 'https://test.supabase.co',
      supabaseKey: 'test-key',
      socketUrl: 'http://localhost:3000'
    });
    
    expect(client.socket).toBeDefined();
  });
});
