import { IsIn, IsString } from 'class-validator';

const KITCHEN_STATIONS = ['BAR', 'KITCHEN'] as const;

/** API_CONTRACT.md mục 3 — POST /categories (OWNER). */
export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsIn(KITCHEN_STATIONS)
  kitchen_station: (typeof KITCHEN_STATIONS)[number];
}
