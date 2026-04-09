import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export enum LlmProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  OLLAMA = 'ollama',
  MISTRAL = 'mistral',
  GEMINI = 'gemini',
}

export enum EmbeddingProvider {
  VOYAGE = 'voyage',
  LOCAL = 'local',
}

export enum NodeEnv {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

export class AppConfig {
  // ===========================================================================
  // GitHub App
  // ===========================================================================

  @IsString()
  @IsNotEmpty()
  GITHUB_APP_ID!: string;

  @IsString()
  @IsNotEmpty()
  GITHUB_PRIVATE_KEY!: string;

  @IsString()
  @IsNotEmpty()
  GITHUB_WEBHOOK_SECRET!: string;

  // ===========================================================================
  // LLM Provider
  // ===========================================================================

  @IsEnum(LlmProvider)
  @IsOptional()
  LLM_PROVIDER: LlmProvider = LlmProvider.ANTHROPIC;

  @IsString()
  @IsOptional()
  LLM_API_KEY?: string;

  @IsString()
  @IsOptional()
  LLM_MODEL?: string;

  @IsString()
  @IsOptional()
  LLM_BASE_URL?: string;

  // ===========================================================================
  // Embedding
  // ===========================================================================

  @IsString()
  @IsOptional()
  VOYAGE_API_KEY?: string;

  @IsEnum(EmbeddingProvider)
  @IsOptional()
  EMBEDDING_PROVIDER: EmbeddingProvider = EmbeddingProvider.VOYAGE;

  @IsString()
  @IsOptional()
  EMBEDDING_MODEL: string = 'voyage-3-lite';

  // ===========================================================================
  // Database & Redis
  // ===========================================================================

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL!: string;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  // ===========================================================================
  // Application
  // ===========================================================================

  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.PRODUCTION;

  @IsEnum(LogLevel)
  @IsOptional()
  LOG_LEVEL: LogLevel = LogLevel.INFO;

  // ===========================================================================
  // Review Tuning
  // ===========================================================================

  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(100)
  @IsOptional()
  MAX_DIFF_LINES: number = 5000;

  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(10)
  @IsOptional()
  MAX_FILE_SIZE_KB: number = 100;

  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  HISTORY_DEPTH: number = 200;

  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  REVIEW_CONCURRENCY: number = 3;

  @Transform(({ value }: { value: string }) => parseFloat(value))
  @Min(0)
  @Max(1)
  @IsOptional()
  SIMILARITY_THRESHOLD: number = 0.75;

  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(5000)
  @IsOptional()
  DEBOUNCE_WINDOW_MS: number = 30000;

  // ===========================================================================
  // Derived helpers
  // ===========================================================================

  get isProduction(): boolean {
    return this.NODE_ENV === NodeEnv.PRODUCTION;
  }

  get isDevelopment(): boolean {
    return this.NODE_ENV === NodeEnv.DEVELOPMENT;
  }

  get llmModelWithDefault(): string {
    if (this.LLM_MODEL) return this.LLM_MODEL;

    const defaults: Record<LlmProvider, string> = {
      [LlmProvider.ANTHROPIC]: 'claude-sonnet-4-20250514',
      [LlmProvider.OPENAI]: 'gpt-4o',
      [LlmProvider.OLLAMA]: 'llama3',
      [LlmProvider.MISTRAL]: 'mistral-large-latest',
      [LlmProvider.GEMINI]: 'gemini-2.5-pro',
    };

    return defaults[this.LLM_PROVIDER];
  }
}
