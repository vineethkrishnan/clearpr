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

// Aliases let users type whatever feels natural ("run", "trigger") and have
// it resolve to the canonical command. Keep aliases tied to `review` only -
// the read-only subcommands (`diff`, `ignore`, `config`) are specific enough
// that an alias would obscure intent more than it would help.
const COMMAND_ALIASES: Record<string, ClearPrCommand> = {
  review: 'review',
  run: 'review',
  trigger: 'review',
  diff: 'diff',
  ignore: 'ignore',
  config: 'config',
};

export function parseClearPrCommand(commentBody: string): ClearPrCommandDto | null {
  const normalized = commentBody.trim().toLowerCase();
  if (!normalized.startsWith('@clearpr')) return null;

  const parts = normalized.split(/\s+/);
  const word = parts[1];
  const command = word ? COMMAND_ALIASES[word] : undefined;
  if (!command) return null;

  const args = parts.slice(2).join(' ').trim();
  const dto = new ClearPrCommandDto();
  dto.command = command;
  if (args.length > 0) dto.args = args;
  return dto;
}
