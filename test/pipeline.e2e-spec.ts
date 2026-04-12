import { Test } from '@nestjs/testing';
import { type INestApplication, Module } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import type { Server } from 'http';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { ConfigModule } from '../src/config/config.module.js';
import { ClsConfigModule } from '../src/shared/infrastructure/cls/cls.module.js';
import { LoggingModule } from '../src/shared/infrastructure/logging/logging.module.js';
import { WebhookController } from '../src/webhook/presentation/webhook.controller.js';
import { WebhookDispatcherService } from '../src/webhook/application/services/webhook-dispatcher.service.js';
import { HmacSignatureGuard } from '../src/webhook/infrastructure/guards/hmac-signature.guard.js';
import { IdempotencyStorePort } from '../src/webhook/domain/ports/idempotency-store.port.js';

import { JobProducerService } from '../src/queue/producers/job-producer.service.js';
import {
  type CommandJobPayload,
  type IndexingJobPayload,
  type ReviewJobPayload,
} from '../src/queue/types/job-payload.types.js';

import { InstallationRepositoryPort } from '../src/github/domain/ports/installation-repository.port.js';
import { RepositoryRepositoryPort } from '../src/github/domain/ports/repository-repository.port.js';
import { Installation } from '../src/github/domain/entities/installation.entity.js';
import { Repository } from '../src/github/domain/entities/repository.entity.js';

import { FileContentProviderPort } from '../src/diff-engine/domain/ports/file-content-provider.port.js';
import { AstNormalizerPort } from '../src/diff-engine/domain/ports/ast-normalizer.port.js';
import { NormalizerRegistryAdapter } from '../src/diff-engine/infrastructure/adapters/normalizer-registry.adapter.js';
import { TypeScriptNormalizer } from '../src/diff-engine/infrastructure/normalizers/typescript.normalizer.js';
import { PhpNormalizer } from '../src/diff-engine/infrastructure/normalizers/php.normalizer.js';
import { JsonNormalizer } from '../src/diff-engine/infrastructure/normalizers/json.normalizer.js';
import { YamlNormalizer } from '../src/diff-engine/infrastructure/normalizers/yaml.normalizer.js';
import { FileProcessorService } from '../src/diff-engine/application/services/file-processor.service.js';
import { SemanticDiffService } from '../src/diff-engine/application/services/semantic-diff.service.js';

import { LlmProviderPort } from '../src/review/domain/ports/llm-provider.port.js';
import { ReviewRepositoryPort } from '../src/review/domain/ports/review-repository.port.js';
import { ReviewPosterPort } from '../src/review/domain/ports/review-poster.port.js';
import { PrFileListProviderPort } from '../src/review/domain/ports/pr-file-list-provider.port.js';
import { type ReviewComment } from '../src/review/domain/entities/review-comment.entity.js';
import { type Review } from '../src/review/domain/entities/review.entity.js';
import { type ReviewContext } from '../src/review/domain/types/review-context.types.js';
import { type LlmResponse } from '../src/review/domain/types/llm-response.types.js';
import { type FileInput } from '../src/diff-engine/application/types/diff-result.types.js';
import { PromptSanitizer } from '../src/review/application/services/prompt-sanitizer.service.js';
import { PromptBuilderService } from '../src/review/application/services/prompt-builder.service.js';
import { GuidelineLoaderService } from '../src/review/application/services/guideline-loader.service.js';
import { ReviewOrchestratorService } from '../src/review/application/services/review-orchestrator.service.js';
import { IgnoreListService } from '../src/review/application/services/ignore-list.service.js';
import { InstallationCleanupService } from '../src/review/application/services/installation-cleanup.service.js';

import { EmbeddingProviderPort } from '../src/memory/domain/ports/embedding-provider.port.js';
import {
  MemoryRepositoryPort,
  type SimilarMemoryResult,
} from '../src/memory/domain/ports/memory-repository.port.js';
import { MemoryRetrieverService } from '../src/memory/application/services/memory-retriever.service.js';

import { REDIS_CLIENT } from '../src/shared/infrastructure/redis/redis.module.js';

const TEST_SECRET = 'e2e-test-secret';

function signPayload(body: string): string {
  return 'sha256=' + createHmac('sha256', TEST_SECRET).update(body).digest('hex');
}

// ---------------------------------------------------------------------------
// Test capture state — one per test run, reset in beforeEach
// ---------------------------------------------------------------------------

interface Capture {
  prompts: string[];
  inlineComments: ReviewComment[][];
  summaries: string[];
  savedStatuses: string[];
}

const capture: Capture = {
  prompts: [],
  inlineComments: [],
  summaries: [],
  savedStatuses: [],
};

function resetCapture(): void {
  capture.prompts = [];
  capture.inlineComments = [];
  capture.summaries = [];
  capture.savedStatuses = [];
}

// ---------------------------------------------------------------------------
// In-memory doubles for external dependencies
// ---------------------------------------------------------------------------

class InMemoryIdempotencyStore extends IdempotencyStorePort {
  private store = new Set<string>();
  async exists(id: string): Promise<boolean> {
    await Promise.resolve();
    return this.store.has(id);
  }
  async mark(id: string): Promise<void> {
    await Promise.resolve();
    this.store.add(id);
  }
}

class FakeInstallationRepo extends InstallationRepositoryPort {
  private stored: Installation | null = null;
  async save(installation: Installation): Promise<Installation> {
    await Promise.resolve();
    this.stored = installation;
    return installation;
  }
  async findByGithubId(_githubInstallationId: number): Promise<Installation | null> {
    await Promise.resolve();
    return this.stored;
  }
}

class FakeRepositoryRepo extends RepositoryRepositoryPort {
  constructor(private readonly repo: Repository) {
    super();
  }
  async save(r: Repository): Promise<Repository> {
    await Promise.resolve();
    return r;
  }
  async findByGithubId(_githubRepoId: number): Promise<Repository | null> {
    await Promise.resolve();
    return this.repo;
  }
  async findByInstallationId(_installationId: string): Promise<Repository[]> {
    await Promise.resolve();
    return [];
  }
  async deleteByInstallationId(_installationId: string): Promise<number> {
    await Promise.resolve();
    return 0;
  }
  async deleteByGithubId(_githubRepoId: number): Promise<Repository | null> {
    await Promise.resolve();
    return null;
  }
}

class FakeReviewRepo extends ReviewRepositoryPort {
  async save(review: Review): Promise<Review> {
    await Promise.resolve();
    capture.savedStatuses.push(String(review.status));
    return review;
  }
  async findByPrAndSha(): Promise<Review | null> {
    await Promise.resolve();
    return null;
  }
  async deleteByRepositoryId(): Promise<number> {
    await Promise.resolve();
    return 0;
  }
  async deleteByRepositoryIds(): Promise<number> {
    await Promise.resolve();
    return 0;
  }
}

class FakeMemoryRepo extends MemoryRepositoryPort {
  async save(): Promise<void> {
    await Promise.resolve();
  }
  async saveBatch(): Promise<void> {
    await Promise.resolve();
  }
  async findSimilar(): Promise<SimilarMemoryResult[]> {
    await Promise.resolve();
    return [];
  }
  async deleteByRepositoryId(): Promise<number> {
    await Promise.resolve();
    return 0;
  }
  async deleteByRepositoryIds(): Promise<number> {
    await Promise.resolve();
    return 0;
  }
}

class FakeEmbeddingProvider extends EmbeddingProviderPort {
  async embed(_text: string): Promise<number[]> {
    await Promise.resolve();
    return new Array(512).fill(0) as number[];
  }
}

class FakeFileContentProvider extends FileContentProviderPort {
  constructor(private readonly contents: Map<string, string>) {
    super();
  }
  async getFileContent(
    _repositoryId: string,
    _installationId: string,
    _owner: string,
    _repo: string,
    ref: string,
    filePath: string,
  ): Promise<string | null> {
    await Promise.resolve();
    return this.contents.get(`${ref}:${filePath}`) ?? null;
  }
}

class FakePrFileListProvider extends PrFileListProviderPort {
  constructor(private readonly files: FileInput[]) {
    super();
  }
  async getPrFiles(): Promise<FileInput[]> {
    await Promise.resolve();
    return this.files;
  }
}

// Canned review response the fake LLM returns. Structured to exercise
// inline-comment posting + summary aggregation through the orchestrator.
const CANNED_LLM_RESPONSE = {
  comments: [
    {
      path: 'config/app.json',
      line: 3,
      side: 'RIGHT',
      severity: 'warning',
      body: 'Hard-coded admin user — move to env var.',
    },
  ],
  summary: 'Found 1 warning.',
};

class FakeLlmProvider extends LlmProviderPort {
  async generateReview(prompt: string, _maxTokens: number): Promise<LlmResponse> {
    await Promise.resolve();
    capture.prompts.push(prompt);
    return {
      content: JSON.stringify(CANNED_LLM_RESPONSE),
      promptTokens: 100,
      completionTokens: 50,
      model: 'fake-model',
    };
  }
}

class FakeReviewPoster extends ReviewPosterPort {
  async postInlineComments(_context: ReviewContext, comments: ReviewComment[]): Promise<void> {
    await Promise.resolve();
    capture.inlineComments.push(comments);
  }
  async postSummary(_context: ReviewContext, summary: string): Promise<void> {
    await Promise.resolve();
    capture.summaries.push(summary);
  }
}

// Minimal Redis stub covering the methods IgnoreListService uses.
class FakeRedis {
  private sets = new Map<string, Set<string>>();
  async sadd(key: string, ...members: string[]): Promise<number> {
    await Promise.resolve();
    const set = this.sets.get(key) ?? new Set<string>();
    for (const m of members) set.add(m);
    this.sets.set(key, set);
    return members.length;
  }
  async scard(key: string): Promise<number> {
    await Promise.resolve();
    return this.sets.get(key)?.size ?? 0;
  }
  async smembers(key: string): Promise<string[]> {
    await Promise.resolve();
    return Array.from(this.sets.get(key) ?? []);
  }
  async srem(key: string, ...members: string[]): Promise<number> {
    await Promise.resolve();
    const set = this.sets.get(key);
    if (!set) return 0;
    let removed = 0;
    for (const m of members) {
      if (set.delete(m)) removed += 1;
    }
    return removed;
  }
  async expire(_key: string, _seconds: number): Promise<number> {
    await Promise.resolve();
    return 1;
  }
  async del(key: string): Promise<number> {
    await Promise.resolve();
    return this.sets.delete(key) ? 1 : 0;
  }
}

// Synchronous JobProducer double: skips BullMQ/Redis and invokes the
// orchestrator directly. Lets the test exercise the full dispatcher →
// review pipeline without needing a real queue infrastructure.
class SyncJobProducer {
  constructor(
    private readonly orchestrator: ReviewOrchestratorService,
    private readonly repoFullName: string,
  ) {}

  async enqueueReview(payload: ReviewJobPayload): Promise<void> {
    const [owner, repo] = this.repoFullName.split('/');
    if (!owner || !repo) return;
    const context: ReviewContext = {
      repositoryId: payload.repositoryId,
      installationId: payload.installationId,
      owner,
      repo,
      prNumber: payload.prNumber,
      prSha: payload.prSha,
      baseBranch: payload.baseBranch,
    };
    await this.orchestrator.execute(context, payload.trigger);
  }

  async enqueueCommand(_payload: CommandJobPayload): Promise<void> {
    await Promise.resolve();
  }

  async enqueueIndexing(_payload: IndexingJobPayload): Promise<void> {
    await Promise.resolve();
  }
}

// ---------------------------------------------------------------------------
// Test module — real pipeline, mocked externals
// ---------------------------------------------------------------------------

const TRACKED_REPO = Repository.create({
  installationId: '00000000-0000-0000-0000-000000000001',
  githubRepoId: 555,
  fullName: 'acme/widgets',
});

const BASE_JSON = JSON.stringify({ admin: null, port: 3000 });
const HEAD_JSON = JSON.stringify({ admin: 'root', port: 3000 });

const fileContents = new Map<string, string>([
  ['main:config/app.json', BASE_JSON],
  ['abc123:config/app.json', HEAD_JSON],
]);

const prFiles: FileInput[] = [
  {
    filename: 'config/app.json',
    status: 'modified',
    additions: 1,
    deletions: 1,
  },
];

@Module({
  imports: [
    ConfigModule,
    ClsConfigModule,
    LoggingModule,
    ThrottlerModule.forRoot([{ name: 'webhook', ttl: 60000, limit: 1000 }]),
  ],
  controllers: [WebhookController],
  providers: [
    // Webhook layer
    WebhookDispatcherService,
    HmacSignatureGuard,
    { provide: IdempotencyStorePort, useClass: InMemoryIdempotencyStore },
    { provide: APP_GUARD, useClass: ThrottlerGuard },

    // GitHub repos (mocked persistence)
    { provide: InstallationRepositoryPort, useClass: FakeInstallationRepo },
    { provide: RepositoryRepositoryPort, useValue: new FakeRepositoryRepo(TRACKED_REPO) },

    // Diff engine (real wiring + fake file content source)
    TypeScriptNormalizer,
    PhpNormalizer,
    JsonNormalizer,
    YamlNormalizer,
    { provide: AstNormalizerPort, useClass: NormalizerRegistryAdapter },
    { provide: FileContentProviderPort, useValue: new FakeFileContentProvider(fileContents) },
    FileProcessorService,
    SemanticDiffService,

    // Memory (real retriever wrapping fake external providers)
    { provide: EmbeddingProviderPort, useClass: FakeEmbeddingProvider },
    { provide: MemoryRepositoryPort, useClass: FakeMemoryRepo },
    MemoryRetrieverService,

    // Review pipeline (real)
    PromptSanitizer,
    GuidelineLoaderService,
    PromptBuilderService,
    IgnoreListService,
    { provide: REDIS_CLIENT, useValue: new FakeRedis() },
    { provide: PrFileListProviderPort, useValue: new FakePrFileListProvider(prFiles) },
    { provide: LlmProviderPort, useClass: FakeLlmProvider },
    { provide: ReviewPosterPort, useClass: FakeReviewPoster },
    { provide: ReviewRepositoryPort, useClass: FakeReviewRepo },
    ReviewOrchestratorService,

    // Cleanup service (unused in this path but wired to satisfy dispatcher DI)
    InstallationCleanupService,

    // Fake job producer bridging dispatcher → orchestrator synchronously
    {
      provide: JobProducerService,
      inject: [ReviewOrchestratorService],
      useFactory: (orchestrator: ReviewOrchestratorService): SyncJobProducer =>
        new SyncJobProducer(orchestrator, TRACKED_REPO.fullName),
    },
  ],
})
class PipelineTestModule {}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Pipeline E2E: webhook → diff → review → post', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PipelineTestModule],
    }).compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    await app.init();
  });

  beforeEach(() => {
    resetCapture();
  });

  afterAll(async () => {
    await app.close();
  });

  it('drives a PR opened webhook all the way to a posted review', async () => {
    const body = JSON.stringify({
      action: 'opened',
      installation: { id: 12345 },
      pull_request: {
        number: 42,
        head: { sha: 'abc123' },
        base: { ref: 'main' },
      },
      repository: {
        id: TRACKED_REPO.githubRepoId,
        full_name: TRACKED_REPO.fullName,
      },
    });

    await request(app.getHttpServer() as Server)
      .post('/webhook')
      .send(body)
      .set('Content-Type', 'application/json')
      .set('x-github-event', 'pull_request')
      .set('x-github-delivery', 'pipeline-delivery-1')
      .set('x-hub-signature-256', signPayload(body))
      .expect(200);

    // LLM was called with a prompt containing the semantic diff
    expect(capture.prompts).toHaveLength(1);
    expect(capture.prompts[0]).toContain('config/app.json');
    expect(capture.prompts[0]).toContain('<semantic-diff>');

    // One inline comment was posted with the canned LLM output
    expect(capture.inlineComments).toHaveLength(1);
    const posted = capture.inlineComments[0] ?? [];
    expect(posted).toHaveLength(1);
    expect(posted[0]?.filePath).toBe('config/app.json');
    expect(posted[0]?.line).toBe(3);
    expect(posted[0]?.body).toContain('admin user');

    // Summary comment was posted with noise-reduction stats
    expect(capture.summaries).toHaveLength(1);
    expect(capture.summaries[0]).toContain('ClearPR Review');
    expect(capture.summaries[0]).toContain('1 warning');

    // Review record transitioned processing → completed
    expect(capture.savedStatuses).toContain('processing');
    expect(capture.savedStatuses[capture.savedStatuses.length - 1]).toBe('completed');
  });
});
