import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { WhitelistService } from './whitelist.service';
import { CreateWhitelistDto } from './dto/create-whitelist.dto';
import { UpdateWhitelistDto } from './dto/update-whitelist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from 'src/auth/guards/roles.decorator';

@Controller('whitelist')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WhitelistController {
    constructor(private readonly whitelistService: WhitelistService) { }

    // ADMIN + STAFF đều xem được (tuỳ bạn)
    @Get()
    findAll(
        @Query('search') search?: string,
        @Query('status') status?: 'all' | 'active' | 'expired' | 'inactive',
    ) {
        return this.whitelistService.findAll({ search, status });
    }

    // ADMIN tạo
    @Post()
    @Roles('ADMIN')
    create(@Body() dto: CreateWhitelistDto, @Req() req: any) {
        // req.user.sub là userId trong JWT payload
        return this.whitelistService.create(dto, req.user?.sub);
    }

    // ADMIN sửa
    @Patch(':id')
    @Roles('ADMIN')
    update(@Param('id') id: string, @Body() dto: UpdateWhitelistDto) {
        return this.whitelistService.update(id, dto);
    }

    // ADMIN bật/tắt
    @Patch(':id/toggle')
    @Roles('ADMIN')
    toggle(@Param('id') id: string) {
        return this.whitelistService.toggle(id);
    }

    // ADMIN xoá
    @Delete(':id')
    @Roles('ADMIN')
    remove(@Param('id') id: string) {
        return this.whitelistService.remove(id);
    }
}
