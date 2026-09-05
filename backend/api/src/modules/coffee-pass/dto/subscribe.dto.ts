import { IsNotEmpty } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class SubscribeDto {
  @IsNotEmpty()
  @IsUuidLoose()
  plan_id: string;
}
