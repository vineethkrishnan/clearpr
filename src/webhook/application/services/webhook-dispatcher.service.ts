import { Injectable, Logger } from '@nestjs/common';
import { IdempotencyStorePort } from '../../domain/ports/idempotency-store.port.js';
import {
  mapWebhookEvent,
  ClearPrAction,
} from '../../domain/value-objects/webhook-event-type.vo.js';
import { JobProducerService } from '../../../queue/producers/job-producer.service.js';
import { InstallationRepositoryPort } from '../../../github/domain/ports/installation-repository.port.js';
import { RepositoryRepositoryPort } from '../../../github/domain/ports/repository-repository.port.js';
import { Installation } from '../../../github/domain/entities/installation.entity.js';
import { Repository } from '../../../github/domain/entities/repository.entity.js';
import { InstallationCleanupService } from '../../../review/application/services/installation-cleanup.service.js';
import type { WebhookPayload } from '../types/webhook-event.types.js';

export interface DispatchResult {
  action: ClearPrAction;
  dispatched: boolean;
  reason?: string;
}

@Injectable()
export class WebhookDispatcherService {
  private readonly logger = new Logger(WebhookDispatcherService.name);

  constructor(
    private readonly idempotencyStore: IdempotencyStorePort,
    private readonly jobProducer: JobProducerService,
    private readonly installationRepo: InstallationRepositoryPort,
    private readonly repositoryRepo: RepositoryRepositoryPort,
    private readonly cleanupService: InstallationCleanupService,
  ) {}

  async dispatch(payload: WebhookPayload): Promise<DispatchResult> {
    // Check idempotency
    const isDuplicate = await this.idempotencyStore.exists(payload.deliveryId);
    if (isDuplicate) {
      this.logger.debug({ deliveryId: payload.deliveryId }, 'Duplicate delivery — skipping');
      return { action: ClearPrAction.UNKNOWN, dispatched: false, reason: 'duplicate' };
    }

    await this.idempotencyStore.mark(payload.deliveryId, payload.event, payload.action);

    const action = mapWebhookEvent(payload.event, payload.action);
    if (action === ClearPrAction.UNKNOWN) {
      return { action, dispatched: false, reason: 'unhandled_event' };
    }

    this.logger.log(
      {
        deliveryId: payload.deliveryId,
        clearprAction: action,
        installationId: payload.installationId,
      },
      `Webhook dispatched: ${action}`,
    );

    switch (action) {
      case ClearPrAction.REVIEW_PR:
        await this.handleReviewPr(payload);
        break;
      case ClearPrAction.PROCESS_COMMAND:
        await this.handleCommand(payload);
        break;
      case ClearPrAction.INSTALLATION_CREATED:
        await this.handleInstallationCreated(payload);
        break;
      case ClearPrAction.INSTALLATION_DELETED:
        await this.handleInstallationDeleted(payload);
        break;
      case ClearPrAction.REPOS_ADDED:
        await this.handleReposAdded(payload);
        break;
      case ClearPrAction.REPOS_REMOVED:
        await this.handleReposRemoved(payload);
        break;
    }

    return { action, dispatched: true };
  }

  private async handleReviewPr(payload: WebhookPayload): Promise<void> {
    const pr = payload.body['pull_request'] as
      | { number: number; head: { sha: string }; base: { ref: string } }
      | undefined;
    const repo = payload.body['repository'] as { id: number; full_name: string } | undefined;
    if (!pr || !repo) return;

    const dbRepo = await this.repositoryRepo.findByGithubId(repo.id);
    if (!dbRepo) return;

    await this.jobProducer.enqueueReview({
      correlationId: payload.deliveryId,
      installationId: String(payload.installationId),
      repositoryId: dbRepo.id,
      repoFullName: repo.full_name,
      prNumber: pr.number,
      prSha: pr.head.sha,
      trigger: 'auto',
      baseBranch: pr.base.ref,
    });
  }

  private async handleCommand(payload: WebhookPayload): Promise<void> {
    const comment = payload.body['comment'] as { body: string; id: number } | undefined;
    const issue = payload.body['issue'] as { number: number } | undefined;
    const repo = payload.body['repository'] as { id: number; full_name: string } | undefined;
    if (!comment || !issue || !repo) return;

    const body = comment.body.trim().toLowerCase();
    if (!body.startsWith('@clearpr')) return;

    const parts = body.split(/\s+/);
    const command = parts[1] as 'review' | 'diff' | 'ignore' | 'config' | undefined;
    if (!command || !['review', 'diff', 'ignore', 'config'].includes(command)) return;

    const dbRepo = await this.repositoryRepo.findByGithubId(repo.id);
    if (!dbRepo) return;

    await this.jobProducer.enqueueCommand({
      correlationId: payload.deliveryId,
      installationId: String(payload.installationId),
      repositoryId: dbRepo.id,
      repoFullName: repo.full_name,
      prNumber: issue.number,
      command,
      args: parts.slice(2).join(' ') || undefined,
      commentId: comment.id,
    });
  }

  private async handleInstallationCreated(payload: WebhookPayload): Promise<void> {
    const account = payload.body['installation'] as
      | {
          id: number;
          account: { login: string; type: string };
        }
      | undefined;
    if (!account) return;

    const installation = Installation.create({
      githubInstallationId: account.id,
      accountLogin: account.account.login,
      accountType: account.account.type as 'Organization' | 'User',
    });
    await this.installationRepo.save(installation);

    // Register initial repositories
    const repos = payload.body['repositories'] as
      | Array<{ id: number; full_name: string }>
      | undefined;
    if (repos) {
      for (const repo of repos) {
        const repository = Repository.create({
          installationId: installation.id,
          githubRepoId: repo.id,
          fullName: repo.full_name,
        });
        await this.repositoryRepo.save(repository);
      }
    }

    // Queue bulk indexing for the new installation
    await this.jobProducer.enqueueIndexing({
      correlationId: payload.deliveryId,
      installationId: installation.id,
      repositoryId: '',
      repoFullName: '',
      type: 'bulk',
    });

    this.logger.log(
      {
        audit: true,
        event: 'installation_created',
        ghInstallationId: account.id,
        accountLogin: account.account.login,
      },
      `Installation created: ${account.account.login}`,
    );
  }

  private async handleInstallationDeleted(payload: WebhookPayload): Promise<void> {
    const ghInstallation = payload.body['installation'] as { id: number } | undefined;
    if (!ghInstallation) return;

    const installation = await this.installationRepo.findByGithubId(ghInstallation.id);
    if (!installation) return;

    const result = await this.cleanupService.cleanupInstallation(
      installation.id,
      ghInstallation.id,
    );

    this.logger.log(
      {
        audit: true,
        event: 'installation_deleted',
        ghInstallationId: ghInstallation.id,
        ...result,
      },
      `Installation deleted: ${ghInstallation.id}`,
    );
  }

  private async handleReposAdded(payload: WebhookPayload): Promise<void> {
    const repos = payload.body['repositories_added'] as
      | Array<{ id: number; full_name: string }>
      | undefined;
    if (!repos) return;

    const ghInstallation = payload.body['installation'] as { id: number } | undefined;
    if (!ghInstallation) return;

    const installation = await this.installationRepo.findByGithubId(ghInstallation.id);
    if (!installation) return;

    for (const repo of repos) {
      const existing = await this.repositoryRepo.findByGithubId(repo.id);
      if (!existing) {
        const repository = Repository.create({
          installationId: installation.id,
          githubRepoId: repo.id,
          fullName: repo.full_name,
        });
        await this.repositoryRepo.save(repository);
      }
    }
  }

  private async handleReposRemoved(payload: WebhookPayload): Promise<void> {
    const repos = payload.body['repositories_removed'] as
      | Array<{ id: number; full_name: string }>
      | undefined;
    if (!repos || repos.length === 0) return;

    for (const repo of repos) {
      const result = await this.cleanupService.cleanupRepository(repo.id);
      this.logger.log(
        {
          audit: true,
          event: 'repository_removed',
          githubRepoId: repo.id,
          fullName: repo.full_name,
          ...(result ?? { skipped: true }),
        },
        `Repository removed: ${repo.full_name}`,
      );
    }
  }
}
