import { IsUUID, IsNotEmpty } from 'class-validator';

export class JoinGroupOrderDto {
  @IsUUID()
  @IsNotEmpty()
  table_id: string;
}
