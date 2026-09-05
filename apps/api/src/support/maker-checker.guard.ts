import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class MakerCheckerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // Giả lập đọc checker_id từ user object đã được auth (hoặc header x-user-id)
    const checkerId = request.headers['x-user-id'];
    
    // Giả lập đọc maker_id từ body hoặc từ database (ở đây mình check qua body cho nhanh)
    const makerId = request.body.makerId || request.headers['x-maker-id'];

    if (!makerId || !checkerId) {
      throw new HttpException({
        code: 'ERR_6001_MISSING_MAKER_OR_CHECKER',
        message: 'Both Maker and Checker IDs are required for approval.'
      }, HttpStatus.FORBIDDEN);
    }

    if (makerId === checkerId) {
      throw new HttpException({
        code: 'ERR_6002_SELF_APPROVAL',
        message: 'Checker cannot be the same as Maker.'
      }, HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
