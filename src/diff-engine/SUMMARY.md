# diff-engine

## Purpose

Turns a list of changed files in a PR into a noise-filtered semantic diff suitable for LLM consumption. For each file it fetches base and head contents from GitHub, picks a language-specific normalizer (TypeScript/JavaScript, PHP, JSON, YAML), and produces hunks plus raw-vs-semantic line counts. Files whose normalized base and head are identical are reported as zero-semantic-line (formatting-only) changes; binary files are skipped. The goal is to reduce the input the LLM sees by stripping comments, whitespace, and reformat-only changes.

## Ports exposed (interfaces other modules can depend on)

- **`FileContentProviderPort`** - fetch a file's contents at a given ref from a repository.
  Implemented by: `infrastructure/adapters/github-file-content.adapter.ts`.
- **`AstNormalizerPort`** - normalize source text to a canonical form for the file's detected `Language`.
  Implemented by: `infrastructure/adapters/normalizer-registry.adapter.ts`, which dispatches to per-language normalizers (`typescript.normalizer.ts`, `php.normalizer.ts`, `json.normalizer.ts`, `yaml.normalizer.ts`) and falls back to whitespace-normalization for unknown languages.

## Ports consumed (dependencies on other modules)

- **`GitHubClientService` (from `github`, concrete dep - candidate for port extraction in P7)** - used by the `GitHubFileContentAdapter` to read raw file contents at base/head SHAs.

## Domain entities

- `FileDiff` - the per-file output: file path, language, hunks, raw line count, semantic line count, strategy (`ast` / `whitespace` / `structural` / `identity`), and rename/new/deleted flags. Exposes a derived `noiseReductionPct`.

## Domain value objects

- `Language` - extension-driven language detection with optional override map; values: `TYPESCRIPT`, `JAVASCRIPT`, `PHP`, `JSON`, `YAML`, `UNKNOWN`. `isSupported` distinguishes AST-capable languages from the whitespace-only fallback.
- `DiffHunk` - `{ startLine, endLine, content, changeType }` where `changeType` is `ADDED`, `REMOVED`, or `MODIFIED`.

## Domain errors

- `DiffTooLargeError` - thrown (defined here, raised by callers) when semantic line count exceeds the configured maximum. The orchestrator currently mirrors this check inline rather than catching this type, so it is mostly a typed marker today.

## Use cases / services

- `SemanticDiffService` - the public entry point: filters binary extensions, processes files in batches of 4, aggregates totals and noise reduction percentage.
- `FileProcessorService` - per-file pipeline: detect language, handle add/remove/rename short-circuits, fetch contents, normalize both sides, compute hunks via `computeLineDiffHunks`. Logs a warning (but proceeds with whitespace fallback) when a file exceeds `MAX_FILE_SIZE_KB`.

## HTTP surface

None - internal module. Consumed by `review`.

## Invariants

- Binary file extensions in the hardcoded `BINARY_EXTENSIONS` set are excluded from processing and reported in `skippedFiles`.
- Pure renames with no content change yield `semanticLines: 0` and strategy `identity`.
- If GitHub returns no content for either side (e.g. file truly added/deleted at the SHA boundary), the file is reported as identity-strategy with `semanticLines == rawLines` so it never silently disappears.
- `semanticLines` is always less than or equal to `rawLines` for the same file when both sides have content (a normalized diff cannot exceed the unnormalized line count).
- Language detection is deterministic given `(filename, languageOverrides)`; overrides win over extension match.
