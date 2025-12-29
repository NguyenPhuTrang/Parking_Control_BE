import { IsBoolean, IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateWhitelistDto {
    @IsOptional()
    @IsString()
    plate?: string;

    @IsOptional()
    @IsString()
    owner?: string;

    @IsOptional()
    @IsString()
    note?: string;

    @IsOptional()
    @IsBoolean()
    active?: boolean;

    @IsOptional()
    @IsDateString()
    validFrom?: string;

    @IsOptional()
    @IsDateString()
    validTo?: string;
}
