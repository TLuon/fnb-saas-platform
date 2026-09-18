import { IsNumber, IsPositive, Max, Min } from 'class-validator';

export class TopupDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  @Min(1)
  @Max(50_000_000)
  amount: number;
}
