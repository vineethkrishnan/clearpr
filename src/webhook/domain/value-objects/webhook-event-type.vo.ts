export enum ClearPrAction {
  REVIEW_PR = 'review_pr',
  PROCESS_COMMAND = 'process_command',
  INSTALLATION_CREATED = 'installation_created',
  INSTALLATION_DELETED = 'installation_deleted',
  REPOS_ADDED = 'repos_added',
  REPOS_REMOVED = 'repos_removed',
  UNKNOWN = 'unknown',
}

export function mapWebhookEvent(event: string, action: string): ClearPrAction {
  switch (event) {
    case 'pull_request':
      if (['opened', 'synchronize', 'reopened'].includes(action)) {
        return ClearPrAction.REVIEW_PR;
      }
      return ClearPrAction.UNKNOWN;

    case 'pull_request_review_comment':
    case 'issue_comment':
      if (action === 'created') {
        return ClearPrAction.PROCESS_COMMAND;
      }
      return ClearPrAction.UNKNOWN;

    case 'installation':
      if (action === 'created') return ClearPrAction.INSTALLATION_CREATED;
      if (action === 'deleted') return ClearPrAction.INSTALLATION_DELETED;
      return ClearPrAction.UNKNOWN;

    case 'installation_repositories':
      if (action === 'added') return ClearPrAction.REPOS_ADDED;
      if (action === 'removed') return ClearPrAction.REPOS_REMOVED;
      return ClearPrAction.UNKNOWN;

    default:
      return ClearPrAction.UNKNOWN;
  }
}
