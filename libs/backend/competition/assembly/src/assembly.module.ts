import { CompileModule } from '@badman/backend-compile';
import { DatabaseModule } from '@badman/backend-database';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { AssemblyController, AssemblyExportController } from './controllers';
import { AssemblyExportService, AssemblyValidationService } from './services';

@Module({
  imports: [
    DatabaseModule,
    CompileModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          view: {
            root: join(__dirname, 'compile', 'libs', 'assembly'),
            engine: 'pug',
          },
          juice: {
            webResources: {
              links: true,
            },
          },
          debug: configService.get('NODE_ENV') === 'development',
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AssemblyValidationService, AssemblyExportService],
  exports: [AssemblyValidationService],
  controllers: [AssemblyController, AssemblyExportController],
})
export class AssemblyModule {}
