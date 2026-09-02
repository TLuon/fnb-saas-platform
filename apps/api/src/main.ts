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

  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3001'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
