import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WhitelistModule } from './whitelist/whitelist.module';
import { HistoryModule } from './history/history.module';
import { CheckModule } from './check/check.module';

// import { AuthModule } from './auth/auth.module';
// import { UsersModule } from './users/users.module';
// import { WhitelistModule } from './whitelist/whitelist.module';
// import { HistoryModule } from './history/history.module';
// import { CheckModule } from './check/check.module';
// import { UsersModule } from './users/users.module';
// import { AuthModule } from './auth/auth.module';
// import { WhitelistModule } from './whitelist/whitelist.module';
// import { HistoryModule } from './history/history.module';
// import { CheckModule } from './check/check.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
      }),
    }),

    AuthModule,
    UsersModule,
    WhitelistModule,
    HistoryModule,
    CheckModule,
  ],
})
export class AppModule {}
