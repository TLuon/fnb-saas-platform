import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SuccessResponse } from '../types/response.types.js';

/**
 * Bọc mọi response thành công vào envelope { success, data, error }
 * — khớp API_CONTRACT.md. Controller chỉ cần return data thô (hoặc
 * { data, meta } khi có phân trang — xem API_CONTRACT.md mục 11),
 * interceptor tự bọc phần còn lại.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((payload) => {
        // Cho phép controller trả { data, meta } khi cần phân trang
        if (
          payload &&
          typeof payload === 'object' &&
          'meta' in payload &&
          'data' in payload
        ) {
          const { data, meta } = payload as { data: T; meta: SuccessResponse<T>['meta'] };
          return { success: true, data, error: null, meta };
        }
        return { success: true, data: payload, error: null };
      }),
    );
  }
}
