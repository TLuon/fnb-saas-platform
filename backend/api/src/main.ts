import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

/**
 * Base URL /api/v1 — khớp API_CONTRACT.md.
 * CORS allow-list theo SETUP.md mục 6 (3 app chạy 3 cổng khác nhau) —
 * KHÔNG dùng origin: '*' khi triển khai thật, xem ghi chú trong file đó.
 * ValidationPipe({ whitelist: true }) tự loại bỏ field lạ ngoài DTO
 * (quan trọng cho bảo mật RegisterDto — xem ghi chú trong dto đó) và
 * throw BadRequestException với mảng lỗi field — GlobalExceptionFilter
 * tự map sang ERR_9001_VALIDATION_FAILED.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (
        !origin ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed for this origin'), false);
      }
    },
    credentials: true,
  });

  // Serve a simple HTML at root to catch Supabase Auth redirects (like password recovery)
  // because Supabase defaults to the Site URL (http://localhost:3000/) when redirect_to is not allowed.
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/', (req: any, res: any) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Đang chuyển hướng...</title>
        <script>
          window.onload = function() {
            var hash = window.location.hash;
            // Chuyển hướng về trang Đặt lại mật khẩu của Customer PWA (thường chạy port 3001)
            var customerAppUrl = 'http://localhost:3001/reset-password';
            window.location.replace(customerAppUrl + hash);
          };
        </script>
      </head>
      <body style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <p>Đang chuyển hướng bạn đến trang ứng dụng...</p>
      </body>
      </html>
    `);
  });

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0');
}
await bootstrap();
