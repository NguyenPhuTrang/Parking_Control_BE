import { Module } from '@nestjs/common';
import { CheckController } from './check.controller';
import { CheckService } from './check.service';
import { WhitelistModule } from '../whitelist/whitelist.module';
import { HistoryModule } from '../history/history.module';

@Module({
  imports: [
    WhitelistModule,
    HistoryModule,
  ],
  controllers: [CheckController],
  providers: [CheckService],
})
export class CheckModule { }
