# What is ClearPR?

You open a PR. It says **20,847 lines changed**. You panic. Then you realize — someone ran Prettier. The actual code change? 47 lines.

GitHub's "Hide whitespace" toggle doesn't help because Prettier doesn't just change whitespace — it rewraps lines, adds trailing commas, reorders imports, and changes quote styles.

**ClearPR fixes this.**

## How It Works

```
GitHub PR Webhook
       |
       v
+---------------+
|  NestJS API   |---- BullMQ ----+
+---------------+                |
                                 v
                     +-----------+-----------+
                     |    Review Worker      |
                     +-----------+-----------+
                        |    |    |
               +--------+    |    +--------+
               v             v             v
      +----------+    +----------+    +----------+
      |tree-sitter|    | pgvector |    |Claude/GPT|
      |Diff Engine|    |PR Memory |    | AI Review|
      +----------+    +----------+    +----------+
               |             |             |
               +-------------+-------------+
                             |
                             v
                 +-------------------+
                 | GitHub PR Comments|
                 +-------------------+
```

## Three Core Features

### 1. Semantic Diff Filtering

ClearPR parses code into an **Abstract Syntax Tree** using [tree-sitter](https://tree-sitter.github.io/tree-sitter/) and compares structure — not text. This strips:

- Whitespace and indentation changes
- Prettier/formatter line rewraps
- Trailing comma additions/removals
- Quote style changes (`'` to `"`)
- Import reordering
- Semicolon changes

### 2. AI-Powered Review

ClearPR sends the **clean diff** (not the raw 20K lines) to an LLM along with your project's own coding guidelines. This means:

- Dramatically fewer tokens = lower cost
- More focused review = better findings
- Context-aware = tied to your team's rules

Supports **5 LLM providers**: Anthropic Claude, OpenAI, Ollama, Mistral, Google Gemini.

### 3. Past PR Memory

ClearPR indexes your team's review history using vector embeddings. When someone makes a mistake that was caught before, ClearPR flags it with context from the original review.

## Token Savings

| PR Size | Without ClearPR | With ClearPR | Savings |
|---------|:-:|:-:|:-:|
| Small (50 lines) | ~2,000 tokens | ~1,500 tokens | 25% |
| Medium + formatter (500 lines) | ~15,000 tokens | ~4,000 tokens | 73% |
| Large + prettier (5000+ lines) | ~80,000 tokens | ~8,000 tokens | 90% |

## Advisory Only

ClearPR is **advisory only** — it posts comments but never approves or blocks PRs. Your existing review workflow stays intact.
