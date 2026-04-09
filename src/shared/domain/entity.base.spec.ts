import { BaseEntity } from './entity.base.js';

class TestEntity extends BaseEntity {
  constructor(id?: string) {
    super(id);
  }
}

describe('BaseEntity', () => {
  it('should generate a UUID id when none provided', () => {
    const entity = new TestEntity();
    expect(entity.id).toBeDefined();
    expect(entity.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('should use provided id', () => {
    const entity = new TestEntity('custom-id');
    expect(entity.id).toBe('custom-id');
  });

  it('should set createdAt and updatedAt', () => {
    const entity = new TestEntity();
    expect(entity.createdAt).toBeInstanceOf(Date);
    expect(entity.updatedAt).toBeInstanceOf(Date);
  });

  it('should compare equality by id', () => {
    const a = new TestEntity('same-id');
    const b = new TestEntity('same-id');
    const c = new TestEntity('diff-id');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
