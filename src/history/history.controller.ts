import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HistoryService } from './history.service';
import { HistoryQueryDto } from './dto/history-query.dto';

@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  async list(@Query() query: HistoryQueryDto, @Req() req: any) {
    const role = (req.user?.role || 'STAFF') as 'ADMIN' | 'STAFF';

    // ✅ lấy userId robust (tùy bạn đang set token thế nào)
    const userIdRaw = req.user?.sub || req.user?.id || req.user?._id;

    if (role === 'STAFF') {
      if (!userIdRaw || !Types.ObjectId.isValid(String(userIdRaw))) {
        // nếu token không có id đúng -> sẽ không lọc được
        throw new BadRequestException('Invalid user id in token (req.user.sub)');
      }
    }

    return this.historyService.queryLogs({
      query,
      role,
      userId: userIdRaw ? String(userIdRaw) : '',
      page: query.page ?? 1,
      limit: query.limit ?? 50,
    });
  }
}
