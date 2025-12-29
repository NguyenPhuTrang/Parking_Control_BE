import { Body, Controller, Post, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckService } from './check.service';
import { CheckDto } from './dto/check.dto';

@Controller('check')
@UseGuards(JwtAuthGuard)
export class CheckController {
  constructor(private readonly checkService: CheckService) {}

  @Post()
  async check(@Body() dto: CheckDto, @Req() req: any) {
    const userId = req.user?.sub || req.user?.id || req.user?._id;
    if (!userId) throw new UnauthorizedException('Unauthorized');

    return this.checkService.checkPlate({
      rawPlate: dto.plate,
      checkedByUserId: String(userId),
      source: dto.source ?? 'MANUAL',
      imageUrl: dto.imageUrl,
      confidence: dto.confidence,
    });
  }
}
