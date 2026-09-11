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
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) {
    return (import.meta as any).env.VITE_API_URL;
  }
  return 'http://localhost:3001/api/v1';
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
});

// Request Interceptor: Attach Token
apiClient.interceptors.request.use(async (reqConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token && reqConfig.headers) {
      reqConfig.headers.Authorization = `Bearer ${token}`;
    }
  }
  return reqConfig;
});

// Response Interceptor: Parse Envelope and Handle Errors
apiClient.interceptors.response.use(
  (response) => {
    // Parse envelope: { success, data, error: { code, message } }
    const data = response.data;
    if (data && typeof data === 'object' && 'success' in data) {
      // If success is false but status is 2xx, throw error to be caught by catch block
      if (data.success === false) {
        return Promise.reject({
          isApiEnvelopeError: true,
          apiError: data.error || { code: 'ERR_UNKNOWN', message: 'Lỗi không xác định' },
          response
        });
      }
      return data.data; // Unwrap successful data
    }
    return data;
  },
  async (error: AxiosError | any) => {
    // If we manually rejected it above as an envelope error
    if (error.isApiEnvelopeError) {
       return Promise.reject(error.apiError);
    }

    const originalRequest = error.config as AxiosRequestConfig;
    
    // Handle automatic retries for safe GET requests
    if (originalRequest && originalRequest.method?.toLowerCase() === 'get') {
      const status = error.response?.status;
      const isNetworkError = !error.response;
      const isServerError = status && status >= 500 && status < 600;

      if (isNetworkError || isServerError) {
        originalRequest._retryCount = originalRequest._retryCount || 0;
        if (originalRequest._retryCount < 2) {
          originalRequest._retryCount += 1;
          // Delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          return apiClient(originalRequest);
        }
      }
    }

    // Handle standard axios errors
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

      // Attach parsed api error
      (error as any).apiError = apiError;

      // Handle 401 & 403 globally
      if (status === 401) {
        // We can emit a custom event or let the callers handle it
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('api:unauthorized'));
        }
      } else if (status === 403) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('api:forbidden'));
        }
      }

      return Promise.reject(apiError);
    }

    return Promise.reject(error);
  }
);
