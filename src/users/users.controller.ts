import { Body, Controller, Get, Patch, Param, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/auth/guards/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Post('staff')
    createStaff(@Body() dto: CreateStaffDto) {
        return this.usersService.createStaff(dto.username, dto.password);
    }

    @Get()
    list() {
        return this.usersService.listUsers();
    }

    @Patch(':id/active')
    setActive(@Param('id') id: string, @Body() body: { isActive: boolean }) {
        return this.usersService.setActive(id, body.isActive);
    }
}
