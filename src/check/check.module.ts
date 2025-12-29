import { Module } from '@nestjs/common';
import { CheckController } from './check.controller';
import { CheckService } from './check.service';
import { WhitelistModule } from '../whitelist/whitelist.module';
import { HistoryModule } from '../history/history.module';
import { AlprModule } from '../alpr/alpr.module';

@Module({
  imports: [
    WhitelistModule,
    HistoryModule,
    AlprModule,
  ],
  controllers: [CheckController],
  providers: [CheckService],
})
export class CheckModule { }
