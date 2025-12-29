import { IsOptional, IsString, IsIn, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckDto {
  @IsString()
  plate: string;

  @IsOptional()
  @IsIn(['MANUAL', 'OCR'])
  source?: 'MANUAL' | 'OCR';

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'confidence must be a number' })
  confidence?: number;
}
