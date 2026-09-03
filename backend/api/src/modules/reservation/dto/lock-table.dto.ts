import { IsNotEmpty, IsUUID } from 'class-validator';

export class LockTableDto {
  @IsUUID()
  @IsNotEmpty()
  table_id: string;
}
