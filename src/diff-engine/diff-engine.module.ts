import { Module } from '@nestjs/common';
import { GitHubModule } from '../github/github.module.js';
import { AstNormalizerPort } from './domain/ports/ast-normalizer.port.js';
import { FileContentProviderPort } from './domain/ports/file-content-provider.port.js';
import { NormalizerRegistryAdapter } from './infrastructure/adapters/normalizer-registry.adapter.js';
import { GitHubFileContentAdapter } from './infrastructure/adapters/github-file-content.adapter.js';
import { TypeScriptNormalizer } from './infrastructure/normalizers/typescript.normalizer.js';
import { PhpNormalizer } from './infrastructure/normalizers/php.normalizer.js';
import { JsonNormalizer } from './infrastructure/normalizers/json.normalizer.js';
import { YamlNormalizer } from './infrastructure/normalizers/yaml.normalizer.js';
import { FileProcessorService } from './application/services/file-processor.service.js';
import { SemanticDiffService } from './application/services/semantic-diff.service.js';

@Module({
  imports: [GitHubModule],
  providers: [
    TypeScriptNormalizer,
    PhpNormalizer,
    JsonNormalizer,
    YamlNormalizer,
    {
      provide: AstNormalizerPort,
      useClass: NormalizerRegistryAdapter,
    },
    {
      provide: FileContentProviderPort,
      useClass: GitHubFileContentAdapter,
    },
    FileProcessorService,
    SemanticDiffService,
  ],
  exports: [SemanticDiffService],
})
export class DiffEngineModule {}
