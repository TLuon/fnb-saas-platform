import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateTableDto } from './create-table.dto.js';

/**
 * API_CONTRACT.md mục 2 — PATCH /tables/:id (OWNER, kéo-thả Floor Editor).
 * Không cho sửa floor_id qua route này — chuyển bàn sang tầng khác
 * không nằm trong phạm vi MVP (SPEC.md không đề cập), tránh side-effect
 * ngoài dự tính.
 */
export class UpdateTableDto extends PartialType(
  OmitType(CreateTableDto, ['floor_id'] as const),
) {}
