import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WhitelistController } from './whitelist.controller';
import { WhitelistService } from './whitelist.service';
import { Whitelist, WhitelistSchema } from './whitelist.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Whitelist.name, schema: WhitelistSchema },
    ]),
  ],
  controllers: [WhitelistController],
  providers: [WhitelistService],
  exports: [WhitelistService],
})
export class WhitelistModule { }
