import { IsIn, IsOptional, IsString } from 'class-validator';

export const CLEARPR_COMMANDS = ['review', 'diff', 'ignore', 'config'] as const;
export type ClearPrCommand = (typeof CLEARPR_COMMANDS)[number];

// Typed result of parsing a `@clearpr <command> <args>` issue comment.
export class ClearPrCommandDto {
  @IsString()
  @IsIn(CLEARPR_COMMANDS)
  command!: ClearPrCommand;

  @IsOptional()
  @IsString()
  args?: string;
}

const COMMAND_SET = new Set<string>(CLEARPR_COMMANDS);

// Parses a comment body into a typed command. Returns null when the comment
// is not addressed to @clearpr or carries an unsupported subcommand. Keeping
// this as a pure function (no Nest pipes) lets the use case decide how to
// surface "no command" vs "invalid command" without throwing across the
// dispatcher chain.
export function parseClearPrCommand(commentBody: string): ClearPrCommandDto | null {
  const normalized = commentBody.trim().toLowerCase();
  if (!normalized.startsWith('@clearpr')) return null;

  const parts = normalized.split(/\s+/);
  const command = parts[1];
  if (!command || !COMMAND_SET.has(command)) return null;

  const args = parts.slice(2).join(' ').trim();
  const dto = new ClearPrCommandDto();
  dto.command = command as ClearPrCommand;
  if (args.length > 0) dto.args = args;
  return dto;
}
