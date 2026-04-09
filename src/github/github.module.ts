import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstallationSchema } from './infrastructure/repositories/installation.schema.js';
import { RepositorySchema } from './infrastructure/repositories/repository.schema.js';
import { TypeOrmInstallationRepository } from './infrastructure/repositories/typeorm-installation.repository.js';
import { TypeOrmRepositoryRepository } from './infrastructure/repositories/typeorm-repository.repository.js';
import { InstallationRepositoryPort } from './domain/ports/installation-repository.port.js';
import { RepositoryRepositoryPort } from './domain/ports/repository-repository.port.js';
import { InstallationTokenService } from './application/services/installation-token.service.js';
import { RateLimiterService } from './application/services/rate-limiter.service.js';
import { GitHubClientService } from './application/services/github-client.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([InstallationSchema, RepositorySchema])],
  providers: [
    {
      provide: InstallationRepositoryPort,
      useClass: TypeOrmInstallationRepository,
    },
    {
      provide: RepositoryRepositoryPort,
      useClass: TypeOrmRepositoryRepository,
    },
    InstallationTokenService,
    RateLimiterService,
    GitHubClientService,
  ],
  exports: [
    InstallationRepositoryPort,
    RepositoryRepositoryPort,
    GitHubClientService,
    InstallationTokenService,
    RateLimiterService,
  ],
})
export class GitHubModule {}
