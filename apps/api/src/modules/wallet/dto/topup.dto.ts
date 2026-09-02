import { IsNumber, Min } from 'class-validator';

export class TopupDto {
  @IsNumber()
  @Min(1)
  amount: number;
}
