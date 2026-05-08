import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstallationRecord } from './infrastructure/repositories/installation.record.js';
import { RepositoryRecord } from './infrastructure/repositories/repository.record.js';
import { TypeOrmInstallationRepository } from './infrastructure/repositories/typeorm-installation.repository.js';
import { TypeOrmRepositoryRepository } from './infrastructure/repositories/typeorm-repository.repository.js';
import { InstallationRepositoryPort } from './domain/ports/installation-repository.port.js';
import { RepositoryRepositoryPort } from './domain/ports/repository-repository.port.js';
import { InstallationTokenService } from './application/use-cases/installation-token.use-case.js';
import { RateLimiterService } from './application/use-cases/rate-limiter.use-case.js';
import { GitHubClientService } from './application/use-cases/github-client.use-case.js';

@Module({
  imports: [TypeOrmModule.forFeature([InstallationRecord, RepositoryRecord])],
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
