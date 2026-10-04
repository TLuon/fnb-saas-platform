import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateFloorDto } from './create-floor.dto.js';

export class UpdateFloorDto extends PartialType(
  OmitType(CreateFloorDto, ['branch_id'] as const),
) {}
