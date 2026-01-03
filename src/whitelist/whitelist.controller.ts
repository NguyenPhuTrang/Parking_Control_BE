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

    @Get()
    findAll(
        @Query('search') search?: string,
        @Query('status') status?: 'all' | 'active' | 'expired' | 'inactive',
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 500,
    ) {
        return this.whitelistService.findAll({ 
            search, 
            status, 
            page: Number(page), 
            limit: Number(limit) 
        });
    }

    @Post()
    @Roles('ADMIN')
    create(@Body() dto: CreateWhitelistDto, @Req() req: any) {
        return this.whitelistService.create(dto, req.user?.sub);
    }

    @Patch(':id')
    @Roles('ADMIN')
    update(@Param('id') id: string, @Body() dto: UpdateWhitelistDto) {
        return this.whitelistService.update(id, dto);
    }

    @Patch(':id/toggle')
    @Roles('ADMIN')
    toggle(@Param('id') id: string) {
        return this.whitelistService.toggle(id);
    }

    @Delete(':id')
    @Roles('ADMIN')
    remove(@Param('id') id: string) {
        return this.whitelistService.remove(id);
    }
}