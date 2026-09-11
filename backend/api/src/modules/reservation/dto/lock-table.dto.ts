import { IsNotEmpty } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class LockTableDto {
  @IsUuidLoose()
  @IsNotEmpty()
  table_id: string;
}
