import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WebhookEventDto } from './webhook-event.dto.js';

// Helper: validate a plain object as a WebhookEventDto with the same options
// the controller-scoped pipe uses (whitelist: true, transform: true).
async function validatePayload(
  raw: Record<string, unknown>,
): Promise<{ instance: WebhookEventDto; errors: string[] }> {
  const instance = plainToInstance(WebhookEventDto, raw, {
    enableImplicitConversion: false,
    excludeExtraneousValues: false,
  });
  const errors = await validate(instance, { whitelist: true });
  const formatted = errors.map((error) => JSON.stringify(error.constraints ?? error.children));
  return { instance, errors: formatted };
}

describe('WebhookEventDto', () => {
  it('validates a pull_request.opened payload', async () => {
    const { instance, errors } = await validatePayload({
      action: 'opened',
      installation: { id: 999 },
      pull_request: {
        number: 42,
        head: { sha: 'abc', ref: 'feature' },
        base: { sha: 'def', ref: 'main' },
      },
      repository: { id: 555, full_name: 'acme/widgets' },
    });

    expect(errors).toEqual([]);
    expect(instance.action).toBe('opened');
    expect(instance.pull_request?.number).toBe(42);
    expect(instance.pull_request?.head.sha).toBe('abc');
    expect(instance.repository?.full_name).toBe('acme/widgets');
  });

  it('validates an issue_comment.created payload with @clearpr command', async () => {
    const { instance, errors } = await validatePayload({
      action: 'created',
      installation: { id: 999 },
      issue: { number: 12 },
      comment: { id: 7, body: '@clearpr review' },
      repository: { id: 555, full_name: 'acme/widgets' },
    });

    expect(errors).toEqual([]);
    expect(instance.comment?.body).toBe('@clearpr review');
    expect(instance.issue?.number).toBe(12);
  });

  it('validates an installation.created payload with initial repositories', async () => {
    const { instance, errors } = await validatePayload({
      action: 'created',
      installation: {
        id: 999,
        account: { login: 'acme', type: 'Organization' },
      },
      repositories: [
        { id: 1, full_name: 'acme/one' },
        { id: 2, full_name: 'acme/two' },
      ],
    });

    expect(errors).toEqual([]);
    expect(instance.installation?.account?.login).toBe('acme');
    expect(instance.repositories).toHaveLength(2);
  });

  it('surfaces a validation error when a required nested field is missing', async () => {
    const { errors } = await validatePayload({
      action: 'opened',
      installation: { id: 999 },
      pull_request: {
        // missing `number`
        head: { sha: 'abc', ref: 'feature' },
        base: { sha: 'def', ref: 'main' },
      },
      repository: { id: 555, full_name: 'acme/widgets' },
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(' ')).toContain('number');
  });

  it('strips unknown extra fields without rejecting the payload', async () => {
    const raw = {
      action: 'opened',
      installation: { id: 999 },
      pull_request: {
        number: 42,
        head: { sha: 'abc', ref: 'feature' },
        base: { sha: 'def', ref: 'main' },
      },
      repository: { id: 555, full_name: 'acme/widgets' },
      // Github sends many fields the DTO does not declare:
      sender: { login: 'octocat', id: 1 },
      organization: { login: 'acme' },
      enterprise: null,
    };

    const instance = plainToInstance(WebhookEventDto, raw);
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: false,
    });
    expect(errors).toEqual([]);
    // Unknown top-level fields remain on the plain object only when whitelist
    // stripping is applied at the pipe layer. Validation alone does not strip
    // extras, but `whitelist: true` ensures they do not surface as errors.
    expect(instance.action).toBe('opened');
  });
});
