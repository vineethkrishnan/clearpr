import { Installation } from './installation.entity.js';
import { InstallationStatusValue } from '../value-objects/installation-status.vo.js';

describe('Installation', () => {
  it('should create with active status by default', () => {
    const inst = Installation.create({
      githubInstallationId: 12345,
      accountLogin: 'acme-corp',
      accountType: 'Organization',
    });
    expect(inst.status.isActive).toBe(true);
    expect(inst.githubInstallationId).toBe(12345);
    expect(inst.accountLogin).toBe('acme-corp');
  });

  it('should deactivate', () => {
    const inst = Installation.create({
      githubInstallationId: 1,
      accountLogin: 'user',
      accountType: 'User',
    });
    inst.deactivate();
    expect(inst.status.isActive).toBe(false);
  });

  it('should reconstitute from persisted data', () => {
    const inst = Installation.reconstitute({
      id: 'uuid-1',
      githubInstallationId: 999,
      accountLogin: 'org',
      accountType: 'Organization',
      status: InstallationStatusValue.INACTIVE,
    });
    expect(inst.id).toBe('uuid-1');
    expect(inst.status.isActive).toBe(false);
  });
});
