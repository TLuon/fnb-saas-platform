import axios, { type AxiosInstance, type AxiosError } from 'axios';

export interface ApiError {
  code: string;
  message?: string;
}

interface ApiClientConfig {
  baseURL: string;
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
  onError?: (error: ApiError) => void;
}

export function createApiClient(config: ApiClientConfig): AxiosInstance {
  const client = axios.create({
    baseURL: config.baseURL,
  });

  if (config.getToken) {
    client.interceptors.request.use(async (reqConfig) => {
      const token = await config.getToken!();
      if (token && reqConfig.headers) {
        reqConfig.headers.Authorization = `Bearer ${token}`;
      }
      return reqConfig;
    });
  }

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (config.onError && error.response?.data) {
        const data = error.response.data as any;
        if (data.error && data.error.code) {
          config.onError({
            code: data.error.code,
            message: data.error.message
          });
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}
