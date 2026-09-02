import { IsString, IsNotEmpty } from 'class-validator';

export class SubscribeDto {
  @IsString()
  @IsNotEmpty()
  plan_id: string;
}
