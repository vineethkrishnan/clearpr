# Webhook Events

ClearPR processes these GitHub webhook events:

## Pull Request Events

| Event | Action | ClearPR Behavior |
|---|---|---|
| `pull_request` | `opened` | Queue automatic review |
| `pull_request` | `synchronize` | Queue review (new commits pushed) |
| `pull_request` | `reopened` | Queue review |
| `pull_request` | `closed` | Ignored |

## Comment Events

| Event | Action | ClearPR Behavior |
|---|---|---|
| `issue_comment` | `created` | Check for `@clearpr` command |
| `pull_request_review_comment` | `created` | Check for `@clearpr` command |

## Installation Events

| Event | Action | ClearPR Behavior |
|---|---|---|
| `installation` | `created` | Register installation, queue PR history indexing |
| `installation` | `deleted` | Mark installation inactive |
| `installation_repositories` | `added` | Track new repositories |
| `installation_repositories` | `removed` | Stop tracking repositories |

## Debounce Behavior

When multiple `pull_request.synchronize` events arrive within 30 seconds for the same PR, ClearPR **debounces** them — only the latest SHA gets reviewed. This prevents wasted reviews when a developer pushes multiple commits rapidly.

## Idempotency

Every webhook delivery is deduplicated using GitHub's `X-GitHub-Delivery` header. If the same delivery arrives twice (GitHub retries), the duplicate is silently skipped.

## All Other Events

Unrecognized events are acknowledged with `200 OK` and silently ignored.
