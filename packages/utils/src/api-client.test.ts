import { describe, it, expect } from 'vitest';
import { createApiClient } from './api-client';

describe('createApiClient', () => {
  it('should create an axios instance with the provided baseURL', () => {
    const baseURL = 'http://localhost:3000/api/v1';
    const client = createApiClient({ baseURL });
    
    expect(client.defaults.baseURL).toBe(baseURL);
  });

  it('should attach Authorization header using getToken function', async () => {
    const baseURL = 'http://localhost:3000/api/v1';
    const getToken = () => 'test-token';
    const client = createApiClient({ baseURL, getToken });
    
    client.defaults.adapter = async (config) => {
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config } as any;
    };

    const response = await client.get('/test');
    expect(response.config.headers.Authorization).toBe('Bearer test-token');
  });

  it('should call onError callback when response fails with mapped error code', async () => {
    const baseURL = 'http://localhost:3000/api/v1';
    let caughtError: any = null;
    
    const client = createApiClient({ 
      baseURL,
      onError: (err) => { caughtError = err; }
    });

    client.defaults.adapter = async (config) => {
      const error: any = new Error('Request failed with status code 401');
      error.isAxiosError = true;
      error.response = {
        status: 401,
        data: {
          error: {
            code: 'ERR_1001_UNAUTHORIZED',
            message: 'Thiếu hoặc sai JWT'
          }
        }
      };
      throw error;
    };

    try {
      await client.get('/protected');
    } catch (e) {}

    expect(caughtError).not.toBeNull();
    expect(caughtError.code).toBe('ERR_1001_UNAUTHORIZED');
  });
});
