import { IsIn, IsOptional } from 'class-validator';
import { IsUuidLoose } from '../../../common/validators/is-uuid-loose.decorator.js';

export class KdsOrdersQueryDto {
  @IsOptional()
  @IsUuidLoose()
  branch_id?: string;

  @IsOptional()
  @IsIn(['BAR', 'KITCHEN'])
  station?: 'BAR' | 'KITCHEN';

  @IsOptional()
  @IsIn(['QUEUED', 'PREPARING', 'READY', 'SERVED'])
  status?: string;
}
