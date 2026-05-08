import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

// ===========================================================================
// Nested DTOs
// ===========================================================================

// Account (org or user) attached to an installation block
export class InstallationAccountDto {
  @IsString()
  @IsNotEmpty()
  login!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;
}

// installation envelope. account is only present on installation.* events;
// for other events Github only sends { id }.
export class InstallationDto {
  @IsInt()
  id!: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => InstallationAccountDto)
  account?: InstallationAccountDto;
}

// pull_request.head and pull_request.base — we only read sha and ref
export class PullRequestRefDto {
  @IsString()
  @IsNotEmpty()
  sha!: string;

  @IsString()
  @IsNotEmpty()
  ref!: string;
}

// pull_request body (subset)
export class PullRequestDto {
  @IsInt()
  number!: number;

  @ValidateNested()
  @Type(() => PullRequestRefDto)
  head!: PullRequestRefDto;

  @ValidateNested()
  @Type(() => PullRequestRefDto)
  base!: PullRequestRefDto;
}

// repository envelope (subset)
export class RepositoryDto {
  @IsInt()
  id!: number;

  @IsString()
  @IsNotEmpty()
  full_name!: string;
}

// issue_comment.comment (subset)
export class IssueCommentDto {
  @IsInt()
  id!: number;

  @IsString()
  body!: string;
}

// issue_comment.issue (subset)
export class IssueDto {
  @IsInt()
  number!: number;
}

// ===========================================================================
// Top-level webhook envelope
// ===========================================================================

// Subset of the GitHub webhook payload covering only the fields the
// dispatcher chain actually reads. Unknown fields are stripped by
// the controller-scoped ValidationPipe (whitelist: true).
export class WebhookEventDto {
  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => InstallationDto)
  installation?: InstallationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PullRequestDto)
  pull_request?: PullRequestDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RepositoryDto)
  repository?: RepositoryDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => IssueCommentDto)
  comment?: IssueCommentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => IssueDto)
  issue?: IssueDto;

  // installation.created sends initial repository list under `repositories`
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RepositoryDto)
  repositories?: RepositoryDto[];

  // installation_repositories.added/.removed
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RepositoryDto)
  repositories_added?: RepositoryDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RepositoryDto)
  repositories_removed?: RepositoryDto[];
}
