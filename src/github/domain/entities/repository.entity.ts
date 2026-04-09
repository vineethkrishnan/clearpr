import { BaseEntity } from '../../../shared/domain/entity.base.js';

export enum IndexingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class Repository extends BaseEntity {
  readonly installationId: string;
  readonly githubRepoId: number;
  readonly fullName: string;
  settings: Record<string, unknown>;
  indexingStatus: IndexingStatus;

  private constructor(params: {
    id?: string;
    installationId: string;
    githubRepoId: number;
    fullName: string;
    settings?: Record<string, unknown>;
    indexingStatus?: IndexingStatus;
  }) {
    super(params.id);
    this.installationId = params.installationId;
    this.githubRepoId = params.githubRepoId;
    this.fullName = params.fullName;
    this.settings = params.settings ?? {};
    this.indexingStatus = params.indexingStatus ?? IndexingStatus.PENDING;
  }

  static create(params: {
    installationId: string;
    githubRepoId: number;
    fullName: string;
  }): Repository {
    return new Repository(params);
  }

  static reconstitute(params: {
    id: string;
    installationId: string;
    githubRepoId: number;
    fullName: string;
    settings: Record<string, unknown>;
    indexingStatus: IndexingStatus;
  }): Repository {
    return new Repository(params);
  }

  markIndexing(): void {
    this.indexingStatus = IndexingStatus.IN_PROGRESS;
    this.updatedAt = new Date();
  }

  markIndexed(): void {
    this.indexingStatus = IndexingStatus.COMPLETED;
    this.updatedAt = new Date();
  }

  markIndexFailed(): void {
    this.indexingStatus = IndexingStatus.FAILED;
    this.updatedAt = new Date();
  }
}
