import { plainToInstance } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength, validate } from 'class-validator';

export const IGNORE_PATTERN_MAX_LENGTH = 200;

// Allow-list of characters that can legitimately appear in glob patterns:
//   alphanumerics, dot, slash, hyphen, underscore, star, question mark,
//   square brackets, and backslash (rarely used but tolerated by globToRegex).
// This is conservative; it rejects shell metacharacters like `;`, backticks,
// quotes, `$`, etc., which have no meaning in our glob matcher and would
// otherwise pollute logs and the issue-comment ack message.
const PATTERN_ALLOWED = /^[A-Za-z0-9_./*?\\[\]-]+$/;

// Validates a user-supplied glob pattern submitted via @clearpr ignore.
// Pattern values flow from untrusted GitHub comment text into Redis-backed
// per-PR storage and into the glob matcher used to filter PR files.
export class IgnorePatternDto {
  @IsString()
  @MinLength(1)
  @MaxLength(IGNORE_PATTERN_MAX_LENGTH)
  @Matches(PATTERN_ALLOWED, {
    message: 'pattern contains characters not allowed in glob expressions',
  })
  pattern!: string;
}

export interface IgnorePatternValidationResult {
  dto: IgnorePatternDto | null;
  errorMessage: string | null;
}

// Validates an ignore pattern at the application boundary (no Nest pipe
// because the value enters via a queued job, not an HTTP request).
export async function validateIgnorePattern(raw: string): Promise<IgnorePatternValidationResult> {
  const trimmed = raw.trim();
  const dto = plainToInstance(IgnorePatternDto, { pattern: trimmed });
  const errors = await validate(dto);
  if (errors.length === 0) return { dto, errorMessage: null };

  const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}));
  return {
    dto: null,
    errorMessage: messages[0] ?? 'invalid ignore pattern',
  };
}
