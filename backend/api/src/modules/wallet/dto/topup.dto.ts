import { IsNumber, IsPositive, Min } from 'class-validator';

export class TopupDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsPositive()
  @Min(1)
  amount: number;
}
