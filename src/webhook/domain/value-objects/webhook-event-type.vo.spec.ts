import { mapWebhookEvent, ClearPrAction } from './webhook-event-type.vo.js';

describe('mapWebhookEvent', () => {
  it('should map pull_request.opened to REVIEW_PR', () => {
    expect(mapWebhookEvent('pull_request', 'opened')).toBe(ClearPrAction.REVIEW_PR);
  });

  it('should map pull_request.synchronize to REVIEW_PR', () => {
    expect(mapWebhookEvent('pull_request', 'synchronize')).toBe(ClearPrAction.REVIEW_PR);
  });

  it('should map pull_request.reopened to REVIEW_PR', () => {
    expect(mapWebhookEvent('pull_request', 'reopened')).toBe(ClearPrAction.REVIEW_PR);
  });

  it('should map pull_request.closed to UNKNOWN', () => {
    expect(mapWebhookEvent('pull_request', 'closed')).toBe(ClearPrAction.UNKNOWN);
  });

  it('should map issue_comment.created to PROCESS_COMMAND', () => {
    expect(mapWebhookEvent('issue_comment', 'created')).toBe(ClearPrAction.PROCESS_COMMAND);
  });

  it('should map installation.created', () => {
    expect(mapWebhookEvent('installation', 'created')).toBe(ClearPrAction.INSTALLATION_CREATED);
  });

  it('should map installation.deleted', () => {
    expect(mapWebhookEvent('installation', 'deleted')).toBe(ClearPrAction.INSTALLATION_DELETED);
  });

  it('should map installation_repositories.added', () => {
    expect(mapWebhookEvent('installation_repositories', 'added')).toBe(ClearPrAction.REPOS_ADDED);
  });

  it('should return UNKNOWN for unrecognized events', () => {
    expect(mapWebhookEvent('star', 'created')).toBe(ClearPrAction.UNKNOWN);
  });
});
