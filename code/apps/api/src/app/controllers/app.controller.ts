import { User } from '@badman/api/authorization';
import { Player } from '@badman/api/database';
import { CpGeneratorService } from '@badman/api/generator';
import {
  Simulation,
  SimulationQueue,
  SimulationV2Job,
  Sync,
  SyncQueue,
} from '@badman/queue';
import { InjectQueue } from '@nestjs/bull';
import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { Queue } from 'bull';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { basename, extname } from 'path';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    @InjectQueue(SimulationQueue) private rankingSim: Queue,
    @InjectQueue(SyncQueue) private rankingSync: Queue,
    private cpGen: CpGeneratorService
  ) {}

  @Get('queue-sim')
  async getQueueSim(
    @User()
    user: Player
  ) {
    if (!user.hasAnyPermission(['calculate:ranking'])) {
      throw new Error('You do not have permission to do this');
    }

    // //
    // this.rankingSim.add(
    //   Simulation.StartV2,
    //   {
    //     systemId: '8f660b40-bc31-47d1-af36-f713c37467fd',
    //     calcDate: '2022-07-03 22:00:00+00',
    //     periods: 1,
    //   } as SimulationV2Job,
    //   {
    //     removeOnComplete: true,
    //   }
    // );

    //
    this.rankingSim.add(
      Simulation.StartV2,
      {
        systemId: 'c6d33db8-a688-42f6-ae9e-f4516d30fd3f',
        calcDate: '2022-07-03 22:00:00+00',
        periods: 1,
      } as SimulationV2Job,
      {
        removeOnComplete: true,
      }
    );
    //
    this.rankingSim.add(
      Simulation.StartV2,
      {
        systemId: 'e6e4c0a8-8403-4ad6-9d0c-f56bd7bdf553',
        calcDate: '2022-07-03 22:00:00+00',
        periods: 1,
      } as SimulationV2Job,
      {
        removeOnComplete: true,
      }
    );

    // DONE
    // 52 weeks - last 25 - 70% up - 30% down
    return this.rankingSim.add(
      Simulation.StartV2,
      {
        systemId: '33c447df-b32d-4981-b515-22f37a22a326',
        calcDate: '2022-07-03 22:00:00+00',
        periods: 1,
      } as SimulationV2Job,
      {
        removeOnComplete: true,
      }
    );
  }

  @Get('queue-sync')
  getQueueSync(
    @User()
    user: Player,

    @Query()
    args: {
      // Changed after date
      date?: Date;
      // Start from certain date
      startDate?: Date;
      // Skip types / event names
      skip: string[];
      // Only types / event names
      only: string[];
      // Continue from a previous (failed) run
      offset: number;
      // Only process a certain number of events
      limit: number;
    }
  ) {
    if (!user.hasAnyPermission(['calculate:ranking'])) {
      throw new Error('You do not have permission to do this');
    }

    return this.rankingSync.add(Sync.SyncEvents, args, {
      removeOnComplete: true,
    });
  }

  @Get('cp')
  async getCp(@Res() res: Response, @Query() query: { eventId: string }) {
    this.logger.debug('Generating CP');
    try {
      const fileLoc = await this.cpGen.generateCpFile(query.eventId);
      const file = createReadStream(fileLoc);
      const extension = extname(fileLoc);
      const fileName = basename(fileLoc, extension);
      res.setHeader(
        'Content-disposition',
        'attachment; filename=' + fileName + extension
      );

      file.pipe(res);
    } catch (e) {
      this.logger.error(e?.process?.message ?? e.message);
      throw e;
    }
  }
}
