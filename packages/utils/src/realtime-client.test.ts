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
});
