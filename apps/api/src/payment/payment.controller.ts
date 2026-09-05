import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { KitchenGateway } from '../kitchen/kitchen.gateway';

@Controller('payment')
export class PaymentController {
  constructor(private readonly kitchenGateway: KitchenGateway) {}

  @Post('webhook/vietqr')
  handleWebhook(@Body() payload: any) {
    const { payment_content } = payload;
    
    // Giả lập tra cứu mã đơn hàng
    if (typeof payment_content !== 'string' || !payment_content.includes('ORD')) {
      throw new HttpException({
        code: 'ERR_3002_PAYMENT_CONTENT_MISMATCH',
        message: 'Content mismatch or order not found'
      }, HttpStatus.BAD_REQUEST);
    }

    const branchId = payload.branchId || 'branch_1';

    // Mock logic: Cập nhật bàn OCCUPIED, đơn hàng PAID, cộng điểm CDP
    const orderData = {
      orderId: payment_content.match(/ORD-\d+/)?.[0] || 'ORD-123456',
      tableName: payload.tableName || 'Bàn 3',
      createdAt: new Date().toISOString(),
      items: payload.items && Array.isArray(payload.items) ? payload.items : [
        { productId: 'PROD-01', name: 'Cà phê Sữa Đá', quantity: 2, notes: 'Ít sữa' },
        { productId: 'PROD-05', name: 'Bánh Croissant', quantity: 1, notes: 'Hâm nóng' }
      ]
    };

    // Bắn sự kiện KDS
    this.kitchenGateway.emitToBranch(branchId, 'new_order', orderData);

    return { success: true, message: 'Payment processed and loyalty points added' };
  }
}
