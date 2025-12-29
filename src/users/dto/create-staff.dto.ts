import { IsString, MinLength } from 'class-validator';

export class CreateStaffDto {
    @IsString()
    username: string;

    @IsString()
    @MinLength(4)
    password: string;
}
