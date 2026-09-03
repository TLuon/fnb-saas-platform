import { IsIn } from 'class-validator';

/** SPEC.md mục 5 — enum status của bảng tables (CHECK constraint trong 001_init.sql). */
export const TABLE_STATUSES = [
  'AVAILABLE',
  'PENDING_LOCK',
  'RESERVED',
  'OCCUPIED',
  'CLEANING',
] as const;
export type TableStatus = (typeof TABLE_STATUSES)[number];

/** API_CONTRACT.md mục 2 — PATCH /tables/:id/status (STAFF). */
export class UpdateTableStatusDto {
  @IsIn(TABLE_STATUSES)
  status: TableStatus;
}
