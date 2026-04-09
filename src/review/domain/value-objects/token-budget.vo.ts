export interface TokenBudget {
  system: number;
  guidelines: number;
  memory: number;
  diff: number;
  response: number;
  total: number;
}

// Token allocation strategy:
// - system: fixed instructions overhead
// - guidelines: project-specific rules (truncated if longer)
// - memory: past PR feedback context
// - response: reserved for LLM output (JSON review)
// - diff: remaining budget after allocating the above
const DEFAULT_CONTEXT_WINDOW = 200_000;
const SYSTEM_TOKENS = 500;
const GUIDELINES_TOKENS = 4_000;
const MEMORY_TOKENS = 2_000;
const RESPONSE_TOKENS = 4_000;

export { RESPONSE_TOKENS };

export function calculateTokenBudget(contextLimit: number = DEFAULT_CONTEXT_WINDOW): TokenBudget {
  const diff = contextLimit - SYSTEM_TOKENS - GUIDELINES_TOKENS - MEMORY_TOKENS - RESPONSE_TOKENS;

  return {
    system: SYSTEM_TOKENS,
    guidelines: GUIDELINES_TOKENS,
    memory: MEMORY_TOKENS,
    diff,
    response: RESPONSE_TOKENS,
    total: contextLimit,
  };
}
