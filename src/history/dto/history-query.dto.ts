import { IsIn, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class HistoryQueryDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsIn(['allowed', 'denied'])
    result?: 'allowed' | 'denied';

    @IsOptional()
    @IsIn(['MANUAL', 'OCR'])
    source?: 'MANUAL' | 'OCR';

    @IsOptional()
    @IsString()
    from?: string; // ISO date

    @IsOptional()
    @IsString()
    to?: string; // ISO date

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number;
}
