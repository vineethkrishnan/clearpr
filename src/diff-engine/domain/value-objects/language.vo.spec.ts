import { Language, LanguageValue } from './language.vo.js';

describe('Language', () => {
  it('should detect TypeScript from .ts extension', () => {
    const lang = Language.detect('src/main.ts');
    expect(lang.value).toBe(LanguageValue.TYPESCRIPT);
    expect(lang.isSupported).toBe(true);
  });

  it('should detect JavaScript from .js extension', () => {
    expect(Language.detect('index.js').value).toBe(LanguageValue.JAVASCRIPT);
  });

  it('should detect TSX as TypeScript', () => {
    expect(Language.detect('App.tsx').value).toBe(LanguageValue.TYPESCRIPT);
  });

  it('should detect PHP', () => {
    expect(Language.detect('routes/web.php').value).toBe(LanguageValue.PHP);
  });

  it('should detect JSON', () => {
    expect(Language.detect('package.json').value).toBe(LanguageValue.JSON);
  });

  it('should detect YAML from .yml', () => {
    expect(Language.detect('config.yml').value).toBe(LanguageValue.YAML);
  });

  it('should detect YAML from .yaml', () => {
    expect(Language.detect('docker-compose.yaml').value).toBe(LanguageValue.YAML);
  });

  it('should return UNKNOWN for unsupported extensions', () => {
    const lang = Language.detect('README.md');
    expect(lang.value).toBe(LanguageValue.UNKNOWN);
    expect(lang.isSupported).toBe(false);
  });

  it('should respect language overrides', () => {
    const lang = Language.detect('component.blade.php', { '*.blade.php': 'php' });
    expect(lang.value).toBe(LanguageValue.PHP);
  });
});
