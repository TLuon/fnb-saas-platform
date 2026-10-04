import axios, { type AxiosInstance, type AxiosError, type AxiosRequestConfig } from 'axios';

export interface ApiError {
  code: string;
  message?: string;
}

// Augment config to keep track of retries
declare module 'axios' {
  export interface AxiosRequestConfig {
    _retryCount?: number;
  }
}

// Detect environment base URL (Next.js vs Vite)
const getBaseURL = () => {
  let url = '';
  if (typeof process !== 'undefined') {
    url = process.env?.NEXT_PUBLIC_API_URL || process.env?.NEXT_PUBLIC_API_BASE_URL || '';
  }
  if (!url && typeof import.meta !== 'undefined') {
    const metaEnv = (import.meta as any).env;
    url = metaEnv?.VITE_API_URL || metaEnv?.VITE_API_BASE_URL || '';
  }
  if (!url) {
    url = 'http://localhost:3001/api/v1';
  }
  url = url.trim().replace(/\/+$/, '');
  if (!url.endsWith('/api/v1')) {
    url = `${url}/api/v1`;
  }
  return url;
};

export interface CreateApiClientOptions {
  baseURL?: string;
  getToken?: () => string | null | undefined;
  onError?: (error: any) => void;
}

export function createApiClient(options: CreateApiClientOptions = {}): AxiosInstance {
  const resolvedBaseURL = options.baseURL
    ? options.baseURL.trim().replace(/\/+$/, '')
    : getBaseURL();

  const instance = axios.create({
    baseURL: resolvedBaseURL,
  });

  instance.interceptors.request.use(async (reqConfig) => {
    if (reqConfig.url) {
      if (reqConfig.url.startsWith('/api/v1/')) {
        reqConfig.url = reqConfig.url.substring('/api/v1'.length);
      } else if (reqConfig.url === '/api/v1') {
        reqConfig.url = '/';
      } else if (reqConfig.url.startsWith('api/v1/')) {
        reqConfig.url = '/' + reqConfig.url.substring('api/v1/'.length);
      } else if (reqConfig.url === 'api/v1') {
        reqConfig.url = '/';
      }
    }

    let token: string | null | undefined = null;
    if (options.getToken) {
      token = options.getToken();
    } else if (typeof window !== 'undefined') {
      try {
        const { authStore } = require('./auth-store');
        token = authStore.getState().accessToken || localStorage.getItem('access_token');
      } catch (e) {
        token = localStorage.getItem('access_token');
      }
    }
    if (token && reqConfig.headers) {
      if (typeof (reqConfig.headers as any).set === 'function') {
        (reqConfig.headers as any).set('Authorization', `Bearer ${token}`);
      } else {
        (reqConfig.headers as any)['Authorization'] = `Bearer ${token}`;
      }
    }

    return reqConfig;
  });

  instance.interceptors.response.use(
    (response) => {
      const data = response.data;
      if (data && typeof data === 'object' && 'success' in data) {
        if (data.success === false) {
          const apiError = data.error || { code: 'ERR_UNKNOWN', message: 'Lỗi không xác định' };
          if (options.onError) {
            options.onError(apiError);
          }
          return Promise.reject({
            isApiEnvelopeError: true,
            apiError,
            response,
          });
        }
        return data.data;
      }
      return response;
    },
    async (error: AxiosError | any) => {
      if (error.isApiEnvelopeError) {
        return Promise.reject(error.apiError);
      }

      const originalRequest = error.config as AxiosRequestConfig;
      if (originalRequest && originalRequest.method?.toLowerCase() === 'get') {
        const status = error.response?.status;
        const isNetworkError = !error.response;
        const isServerError = status && status >= 500 && status < 600;

        if (isNetworkError || isServerError) {
          originalRequest._retryCount = originalRequest._retryCount || 0;
          if (originalRequest._retryCount < 2) {
            originalRequest._retryCount += 1;
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return instance(originalRequest);
          }
        }
      }

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data as any;

        let apiError: ApiError = { code: 'ERR_UNKNOWN', message: 'Lỗi máy chủ' };
        if (data && data.error && data.error.code) {
          apiError = {
            code: data.error.code,
            message: data.error.message,
          };
        } else if (data && data.code) {
          apiError = { code: data.code, message: data.message };
        } else if (data && data.message) {
          apiError = { code: 'ERR_UNKNOWN', message: data.message };
        }

        (error as any).apiError = apiError;

        if (options.onError) {
          options.onError(apiError);
        }

        if (status === 401 && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('api:unauthorized'));
        } else if (status === 403 && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('api:forbidden'));
        }

        return Promise.reject(apiError);
      }

      if (options.onError) {
        options.onError(error);
      }

      return Promise.reject(error);
    }
  );

  return instance;
}

export const apiClient: AxiosInstance = createApiClient();
