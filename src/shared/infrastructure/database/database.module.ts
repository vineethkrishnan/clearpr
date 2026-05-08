import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig, NodeEnv } from '../../../config/app.config.js';

const resolveSslOption = (config: AppConfig): false | { rejectUnauthorized: boolean } => {
  if (config.DATABASE_SSL === false) return false;
  if (config.DATABASE_SSL === true) return { rejectUnauthorized: true };
  return config.NODE_ENV === NodeEnv.PRODUCTION ? { rejectUnauthorized: true } : false;
};

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        type: 'postgres',
        url: config.DATABASE_URL,
        ssl: resolveSslOption(config),
        autoLoadEntities: true,
        synchronize: false,
        extra: {
          max: 20,
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          statement_timeout: '30s',
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
