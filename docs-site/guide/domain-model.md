# Domain Model

## Entities

### Installation
Represents a GitHub App installation (one org or user account).

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Internal ID |
| `githubInstallationId` | number | GitHub's installation ID |
| `accountLogin` | string | GitHub org/user login |
| `accountType` | `Organization` or `User` | Account type |
| `status` | InstallationStatus | `active` or `inactive` |

### Repository
A repository tracked by ClearPR under an installation.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Internal ID |
| `installationId` | UUID | FK to Installation |
| `githubRepoId` | number | GitHub's repo ID |
| `fullName` | string | `owner/repo` format |
| `settings` | JSON | Per-repo config overrides |
| `indexingStatus` | enum | `pending`, `in_progress`, `completed`, `failed` |

### Review
A single review execution for a PR.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Internal ID |
| `repositoryId` | UUID | FK to Repository |
| `prNumber` | number | PR number |
| `prSha` | string | Head commit SHA at review time |
| `trigger` | enum | `auto`, `manual`, `rerun` |
| `status` | enum | `queued`, `processing`, `completed`, `failed`, `skipped` |
| `rawDiffLines` | number | Total raw diff lines |
| `semanticDiffLines` | number | Lines after filtering |
| `noiseReductionPct` | number | Percentage of noise removed |
| `modelUsed` | string | LLM model ID |

### PrMemoryEntry
A stored review comment with its vector embedding.

| Field | Type | Description |
|---|---|---|
| `id` | UUID | Internal ID |
| `repositoryId` | UUID | FK to Repository |
| `prNumber` | number | Source PR |
| `commentText` | string | The review comment |
| `codeContext` | string | Surrounding diff hunk |
| `outcome` | enum | `accepted` or `dismissed` |
| `embedding` | vector(512) | For similarity search |

## Value Objects

| Name | Module | Purpose |
|---|---|---|
| `Language` | Diff Engine | File language detection |
| `DiffHunk` | Diff Engine | One contiguous block of changes |
| `Severity` | Review | `critical`, `warning`, `info` |
| `ReviewStatus` | Review | State machine for review lifecycle |
| `TokenBudget` | Review | Token allocation per prompt section |
| `FeedbackOutcome` | Memory | Whether feedback was acted on |
| `InstallationStatus` | GitHub | Active/inactive state |
| `DeliveryId` | Webhook | GitHub delivery UUID |
