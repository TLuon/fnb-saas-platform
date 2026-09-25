import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('redis.url') || 'redis://localhost:6379';
    this.client = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    this.client.on('error', (err) => {
      this.logger.warn(`Redis connection event: ${err.message}`);
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
