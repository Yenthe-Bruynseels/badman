import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { RankingComsumer } from './processors/ranking';
import { ScheduleModule } from '@nestjs/schedule';
import { SyncService } from './services/sync.service';

@Module({
  providers: [RankingComsumer, SyncService],
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({
      name: 'sync-queue',
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10),
      },
    }),
  ],
})
export class SyncModule {}
