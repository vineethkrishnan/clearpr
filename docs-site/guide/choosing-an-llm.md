# Choosing an LLM

Code review is the single hardest task ClearPR asks the model to do. The diff engine, queue, GitHub plumbing, and prompt are all model-agnostic. **Review quality is bounded entirely by the model you point ClearPR at.**

Pick wrong and you'll see exactly two failure modes:

- **False positives**: confident warnings about code that's already correct.
- **Missed bugs**: real issues the model walks straight past without flagging.

This page lists what's worked, what hasn't, and what to use for production.

## TL;DR

| Use case | Recommended model | Provider |
|---|---|---|
| **Production** | `claude-sonnet-4-20250514` | Anthropic |
| **Production (alternate)** | `gpt-4o` | OpenAI |
| **Cost-sensitive** | `claude-haiku-4-5-20251001` | Anthropic |
| **Local / air-gapped** | `qwen2.5-coder:32b` (or larger) | Ollama |
| **Demo / verifying setup only** | any small local model | LM Studio / Ollama |

::: warning
**Do not run small local models against real PRs.** `gemma-4-e4b`, `phi-3-mini`, `llama3-8b`, and similar 4-8B parameter models will produce reviews that miss real bugs and hallucinate fake ones. Use them only to verify the pipeline works end-to-end during setup; switch to a stronger model before turning the bot on against shared repos.
:::

## What we've actually observed

ClearPR was validated end-to-end against `google/gemma-4-e4b` running in LM Studio on a real PR with two deliberate seeds:

- A **cosmetic-only** rewrite of `discount.ts` (quote style, switch -> if/else, JSDoc additions, parameter renames). No semantic change.
- A **new `cart.ts` file** containing a real bug: `discountAmount = total - subtotal`, which is always negative after a discount.

The diff engine correctly filtered ~25% as noise. Review cost: 58 seconds.

What the model produced:

- One inline comment on `discount.ts:17`: a confident **false positive** claiming `return amount * multiplier` had been removed, when it was visibly present six lines below.
- Zero comments on `cart.ts` -- the real `total - subtotal` sign bug was missed completely.

This is consistent with what other teams report on small models: **they pattern-match diff structure rather than read the resulting code.** Removed `case` arms in a `switch` lit up the model's "missing return" pattern; an algebraically wrong expression in a brand-new file did not.

## Why it matters

Review noise is asymmetric:

- A **missed bug** is a regression that ships. The reviewer added zero value.
- A **false positive** trains the team to ignore review comments. Eventually a real warning lands and gets dismissed alongside the noise.

Both failure modes erode trust in the bot. A bot you don't trust is worse than no bot.

## Provider matrix

### Anthropic (recommended)

```env
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...
LLM_MODEL=claude-sonnet-4-20250514
```

- **Sonnet 4**: the default for production. Strong on multi-file reasoning, follows the JSON output schema reliably, doesn't hallucinate function signatures.
- **Haiku 4.5**: roughly 4x cheaper, ~80% of Sonnet's review quality on small-to-medium diffs. Worth it for high-PR-volume repos where review cost matters.
- **Opus 4.7**: overkill for routine reviews, but the model to reach for if you also use ClearPR for architectural-review prompts via `@clearpr review`.

Get a key: <https://console.anthropic.com>.

### OpenAI

```env
LLM_PROVIDER=openai
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o
```

- **gpt-4o**: comparable to Sonnet 4 on review quality. Slightly faster, sometimes more verbose summaries.
- **gpt-4o-mini**: avoid for review. Output is too short and skips real findings.

Get a key: <https://platform.openai.com/api-keys>.

### Mistral / Gemini

Both work via the existing adapters. In our testing they sit between OpenAI and Anthropic on review quality but lag noticeably on multi-file reasoning. Use them if you have an existing contract or strong preference; default to Anthropic or OpenAI otherwise.

### Ollama (self-hosted)

```env
LLM_PROVIDER=ollama
LLM_BASE_URL=http://host.docker.internal:11434
LLM_MODEL=qwen2.5-coder:32b
```

If you must self-host, **size matters more than family**. Practical floor for useful review:

- `qwen2.5-coder:32b` -- the smallest model we'd actually trust for review. Hits real bugs on the cart.ts test case above.
- `llama3.3:70b` -- broader knowledge, slightly weaker at code reasoning than qwen2.5-coder. Needs a serious GPU.

Anything below 14B parameters: assume it will miss bugs. Use only for verifying the plumbing.

### LM Studio (local OpenAI-compatible)

```env
LLM_PROVIDER=openai
LLM_BASE_URL=http://host.docker.internal:1234/v1
LLM_MODEL=qwen2.5-coder-32b-instruct
LLM_API_KEY=lm-studio
```

`LLM_API_KEY` can be any non-empty string -- LM Studio doesn't validate it. Same model-size warning as Ollama: small models miss real bugs.

## How to test before you trust

Before pointing the bot at any non-trivial repo:

1. Fork a known-buggy PR (or use the `clearpr-quickstart` demo).
2. Configure ClearPR with your chosen model.
3. Comment `@clearpr review`.
4. Read the result against ground truth: did it find the real bug? Did it flag anything that wasn't actually wrong?

If the answer to either question is "no" or "yes" respectively, the model is too weak for production. Step up a tier.

## Cost note

For a typical PR (300-500 raw lines after diff filter, ~3-4 KB prompt), Sonnet 4 costs roughly $0.02-0.05 per review. At 50 PRs / week that's $1-2.50/week per repo -- a fraction of a single hour of engineering time spent chasing missed bugs.

Local models are "free" in API cost but cost real time to run, real GPU power, and real engineering hours when they miss bugs. Account for that in the comparison.

## Switching providers

Edit `.env`, restart the app:

```bash
docker compose restart app
```

Or with `@clearpr config` you can verify the active provider from any PR:

```
@clearpr config
```

The bot replies with the resolved `LLM_PROVIDER`, model, and other tunables.
