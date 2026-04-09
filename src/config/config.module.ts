import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AppConfig } from './app.config.js';

function validate(config: Record<string, unknown>): AppConfig {
  const validated = plainToInstance(AppConfig, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((e) => Object.values(e.constraints ?? {}).join(', '))
      .join('\n  - ');
    throw new Error(`Configuration validation failed:\n  - ${messages}`);
  }

  return validated;
}

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      validate,
      isGlobal: true,
    }),
  ],
  providers: [
    {
      provide: AppConfig,
      useFactory: () => {
        return validate(process.env as Record<string, unknown>);
      },
    },
  ],
  exports: [AppConfig],
})
export class ConfigModule {}
