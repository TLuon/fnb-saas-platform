/** Envelope chuẩn — khớp API_CONTRACT.md phần Response envelope */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  error: null;
  meta?: { total: number; page: number; limit: number };
}

export interface ErrorResponse {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
