import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class MockPaymentDto {
  @IsString()
  @IsNotEmpty()
  raw_transfer_content: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;
}
