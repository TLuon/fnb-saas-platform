import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import Redis from 'ioredis';
import { KitchenGateway } from '../kitchen/kitchen.gateway';

@Injectable()
export class GroupOrderService {
  private redisClient: Redis;
  private readonly logger = new Logger(GroupOrderService.name);

  constructor(private readonly kitchenGateway: KitchenGateway) {
    // Basic redis connection, fallback to memory if redis isn't available
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
      maxRetriesPerRequest: 1, // Fail fast if no redis
    });
    
    this.redisClient.on('error', (err) => {
      console.warn('Redis connection failed, continuing without persistence (In-memory fallback not fully implemented in this mock)');
    });
  }

  async getCart(tableId: string) {
    try {
      const data = await this.redisClient.get(`group_order:table_id:${tableId}`);
      return data ? JSON.parse(data) : { items: [], version: 1 };
    } catch {
      return { items: [], version: 1 };
    }
  }

  async addItem(tableId: string, item: any, userId: string) {
    if (!item || !item.id || !item.name || typeof item.price !== 'number') {
      throw new HttpException('Invalid item format', HttpStatus.BAD_REQUEST);
    }
    const key = `group_order:table_id:${tableId}`;
    let cart;

    // Retry loop for optimistic locking
    for (let attempts = 0; attempts < 3; attempts++) {
      try {
        await this.redisClient.watch(key);
        const data = await this.redisClient.get(key);
        cart = data ? JSON.parse(data) : { items: [], version: 1 };
        
        cart.items.push({ ...item, userId });
        cart.version += 1;

        const results = await this.redisClient.multi().set(key, JSON.stringify(cart)).exec();
        if (results !== null) {
          // Success
          break;
        }
      } catch (err: any) {
        this.logger.error(`Redis error during addItem: ${err.message}`, err.stack);
        await this.redisClient.unwatch();
      }
    }
    
    if (!cart) {
      throw new HttpException('Failed to add item due to concurrency', HttpStatus.CONFLICT);
    }
    
    this.kitchenGateway.emitToRoom(`table:${tableId}`, 'group_order_cart_updated', cart);
    return cart;
  }

  async removeItem(tableId: string, itemId: string, userId: string) {
    const cart = await this.getCart(tableId);
    const itemIdx = cart.items.findIndex((i: any) => i.id === itemId);
    if (itemIdx === -1) return cart;
    if (cart.items[itemIdx].userId !== userId) {
      throw new HttpException('Cannot remove item of another user', HttpStatus.FORBIDDEN);
    }
    cart.items.splice(itemIdx, 1);
    cart.version += 1;
    
    try {
      await this.redisClient.set(`group_order:table_id:${tableId}`, JSON.stringify(cart));
    } catch (err: any) {
      this.logger.error(`Failed to save cart to Redis: ${err.message}`, err.stack);
    }

    this.kitchenGateway.emitToRoom(`table:${tableId}`, 'group_order_cart_updated', cart);
    return cart;
  }
}
