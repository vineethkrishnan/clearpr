import { Injectable } from '@nestjs/common';
import { Octokit } from 'octokit';
import { InstallationTokenService } from './installation-token.service.js';
import { RateLimiterService } from './rate-limiter.service.js';
import { GitHubApiError } from '../../domain/errors/github.errors.js';
import type {
  GitHubPrFile,
  GitHubPr,
  GitHubMergedPr,
  GitHubReviewComment,
  GitHubPrCommit,
} from '../types/github-types.js';

@Injectable()
export class GitHubClientService {
  constructor(
    private readonly tokenService: InstallationTokenService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  private async getOctokit(installationId: number): Promise<Octokit> {
    this.rateLimiter.checkBeforeRequest();
    const token = await this.tokenService.getToken(installationId);
    return new Octokit({ auth: token });
  }

  private updateRateLimit(headers: Record<string, string | undefined>): void {
    const remaining = headers['x-ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'];
    if (remaining && reset) {
      this.rateLimiter.update(parseInt(remaining, 10), parseInt(reset, 10));
    }
  }

  async getPullRequest(
    installationId: number,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<GitHubPr> {
    try {
      const octokit = await this.getOctokit(installationId);
      const { data, headers } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });
      this.updateRateLimit(headers as Record<string, string | undefined>);

      return {
        number: data.number,
        sha: data.head.sha,
        baseBranch: data.base.ref,
        headBranch: data.head.ref,
        title: data.title,
        body: data.body,
      };
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async getPullRequestFiles(
    installationId: number,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<GitHubPrFile[]> {
    try {
      const octokit = await this.getOctokit(installationId);
      const { data, headers } = await octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: prNumber,
        per_page: 300,
      });
      this.updateRateLimit(headers as Record<string, string | undefined>);

      return data.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch,
        previousFilename: file.previous_filename,
      }));
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async getFileContent(
    installationId: number,
    owner: string,
    repo: string,
    ref: string,
    filePath: string,
  ): Promise<string | null> {
    try {
      const octokit = await this.getOctokit(installationId);
      const { data, headers } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref,
      });
      this.updateRateLimit(headers as Record<string, string | undefined>);

      if ('content' in data && data.encoding === 'base64') {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      return null;
    } catch (error) {
      if (
        error instanceof Error &&
        'status' in error &&
        (error as { status: number }).status === 404
      ) {
        return null;
      }
      throw this.wrapError(error);
    }
  }

  async createPullRequestReview(
    installationId: number,
    owner: string,
    repo: string,
    prNumber: number,
    body: string,
    comments: Array<{ path: string; line: number; body: string; side?: string }>,
  ): Promise<void> {
    try {
      const octokit = await this.getOctokit(installationId);
      const { headers } = await octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        body,
        event: 'COMMENT',
        comments: comments.map((c) => ({
          path: c.path,
          line: c.line,
          body: c.body,
          side: (c.side as 'LEFT' | 'RIGHT') ?? 'RIGHT',
        })),
      });
      this.updateRateLimit(headers as Record<string, string | undefined>);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async listMergedPullRequests(
    installationId: number,
    owner: string,
    repo: string,
    limit: number,
  ): Promise<GitHubMergedPr[]> {
    try {
      const octokit = await this.getOctokit(installationId);
      const merged: GitHubMergedPr[] = [];
      const perPage = Math.min(limit, 100);
      let page = 1;

      while (merged.length < limit) {
        const { data, headers } = await octokit.rest.pulls.list({
          owner,
          repo,
          state: 'closed',
          sort: 'updated',
          direction: 'desc',
          per_page: perPage,
          page,
        });
        this.updateRateLimit(headers as Record<string, string | undefined>);
        if (data.length === 0) break;

        for (const pr of data) {
          if (!pr.merged_at) continue;
          merged.push({
            number: pr.number,
            mergedAt: new Date(pr.merged_at),
            mergeCommitSha: pr.merge_commit_sha,
            title: pr.title,
          });
          if (merged.length >= limit) break;
        }
        if (data.length < perPage) break;
        page++;
      }

      return merged;
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async listPullRequestReviewComments(
    installationId: number,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<GitHubReviewComment[]> {
    try {
      const octokit = await this.getOctokit(installationId);
      const collected: GitHubReviewComment[] = [];
      const perPage = 100;
      let page = 1;

      while (true) {
        const { data, headers } = await octokit.rest.pulls.listReviewComments({
          owner,
          repo,
          pull_number: prNumber,
          per_page: perPage,
          page,
        });
        this.updateRateLimit(headers as Record<string, string | undefined>);

        for (const comment of data) {
          collected.push({
            id: comment.id,
            prNumber,
            authorLogin: comment.user?.login ?? 'unknown',
            body: comment.body,
            filePath: comment.path,
            startLine: comment.start_line ?? null,
            line: comment.line ?? null,
            diffHunk: comment.diff_hunk,
            createdAt: new Date(comment.created_at),
          });
        }
        if (data.length < perPage) break;
        page++;
      }

      return collected;
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async listPullRequestCommits(
    installationId: number,
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<GitHubPrCommit[]> {
    try {
      const octokit = await this.getOctokit(installationId);
      const collected: GitHubPrCommit[] = [];
      const perPage = 100;
      let page = 1;

      while (true) {
        const { data, headers } = await octokit.rest.pulls.listCommits({
          owner,
          repo,
          pull_number: prNumber,
          per_page: perPage,
          page,
        });
        this.updateRateLimit(headers as Record<string, string | undefined>);

        for (const entry of data) {
          const committed = entry.commit.committer?.date ?? entry.commit.author?.date;
          if (!committed) continue;
          // The commits endpoint doesn't return changed files; fetch each
          // commit's file list. This is the costly bit and is bounded by
          // HISTORY_DEPTH at the caller.
          const { data: detail, headers: detailHeaders } = await octokit.rest.repos.getCommit({
            owner,
            repo,
            ref: entry.sha,
          });
          this.updateRateLimit(detailHeaders as Record<string, string | undefined>);
          collected.push({
            sha: entry.sha,
            committedAt: new Date(committed),
            changedFiles: (detail.files ?? []).map((file) => file.filename),
          });
        }
        if (data.length < perPage) break;
        page++;
      }

      return collected;
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  async createIssueComment(
    installationId: number,
    owner: string,
    repo: string,
    issueNumber: number,
    body: string,
  ): Promise<void> {
    try {
      const octokit = await this.getOctokit(installationId);
      const { headers } = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body,
      });
      this.updateRateLimit(headers as Record<string, string | undefined>);
    } catch (error) {
      throw this.wrapError(error);
    }
  }

  private wrapError(error: unknown): GitHubApiError {
    if (error instanceof GitHubApiError) return error;
    const statusCode =
      error instanceof Error && 'status' in error ? (error as { status: number }).status : 500;
    const message = error instanceof Error ? error.message : 'Unknown GitHub API error';
    return new GitHubApiError(message, statusCode);
  }
}
