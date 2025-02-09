import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController, ImageController } from './controllers';

import { AuthorizationModule } from '@badman/backend-authorization';
import { DatabaseModule } from '@badman/backend-database';
import { GeneratorModule } from '@badman/backend-generator';
import { GrapqhlModule } from '@badman/backend-graphql';
import { HealthModule } from '@badman/backend-health';
import { LoggingModule } from '@badman/backend-logging';
import { MailingModule } from '@badman/backend-mailing';
import { NotificationsModule } from '@badman/backend-notifications';
import { QueueModule } from '@badman/backend-queue';
import { SearchModule } from '@badman/backend-search';
import { TranslateModule } from '@badman/backend-translate';
import { TwizzitModule } from '@badman/backend-twizzit';
import versionPackage from '../version.json';
import { EventsModule } from './events';
@Module({
  imports: [
    ConfigModule.forRoot(),
    AuthorizationModule,
    GrapqhlModule,
    DatabaseModule,

    // Lib modules
    LoggingModule.forRoot({
      version: versionPackage.version,
      name: 'api',
    }),
    TwizzitModule,
    MailingModule,
    NotificationsModule,
    GeneratorModule,
    SearchModule,
    QueueModule,
    EventsModule,
    HealthModule,
    TranslateModule,
  ],
  controllers: [AppController, ImageController],
  providers: [Logger],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);
  constructor(configService: ConfigService) {
    this.logger.log(
      `${AppModule.name} loaded, env: ${configService.get('NODE_ENV')}`
    );
  }
}
