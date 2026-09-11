import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateKitchenStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['QUEUED', 'PREPARING', 'READY', 'SERVED'])
  kitchen_status: string;
}
