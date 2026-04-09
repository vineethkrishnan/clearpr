export interface TokenBudget {
  system: number;
  guidelines: number;
  memory: number;
  diff: number;
  response: number;
  total: number;
}

export function calculateTokenBudget(contextLimit: number = 200000): TokenBudget {
  const system = 500;
  const guidelines = 4000;
  const memory = 2000;
  const response = 4000;
  const diff = contextLimit - system - guidelines - memory - response;

  return { system, guidelines, memory, diff, response, total: contextLimit };
}
