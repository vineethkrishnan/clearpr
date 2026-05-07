import { Injectable } from '@nestjs/common';
import { JobProducerService } from '../../../queue/application/use-cases/job-producer.use-case.js';
import { RepositoryRepositoryPort } from '../../../github/domain/ports/repository-repository.port.js';
import type { WebhookPayload } from '../types/webhook-event.types.js';

type SupportedCommand = 'review' | 'diff' | 'ignore' | 'config';

const SUPPORTED_COMMANDS: ReadonlyArray<SupportedCommand> = ['review', 'diff', 'ignore', 'config'];

@Injectable()
export class EnqueueCommandUseCase {
  constructor(
    private readonly jobProducer: JobProducerService,
    private readonly repositoryRepo: RepositoryRepositoryPort,
  ) {}

  async execute(payload: WebhookPayload): Promise<void> {
    const comment = payload.body['comment'] as { body: string; id: number } | undefined;
    const issue = payload.body['issue'] as { number: number } | undefined;
    const repo = payload.body['repository'] as { id: number; full_name: string } | undefined;
    if (!comment || !issue || !repo) return;

    const body = comment.body.trim().toLowerCase();
    if (!body.startsWith('@clearpr')) return;

    const parts = body.split(/\s+/);
    const command = parts[1] as SupportedCommand | undefined;
    if (!command || !SUPPORTED_COMMANDS.includes(command)) return;

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
}
