import { BaseEntity } from '../../../shared/domain/entity.base.js';
import {
  InstallationStatus,
  InstallationStatusValue,
} from '../value-objects/installation-status.vo.js';

export class Installation extends BaseEntity {
  readonly githubInstallationId: number;
  readonly accountLogin: string;
  readonly accountType: 'Organization' | 'User';
  private _status: InstallationStatus;

  private constructor(params: {
    id?: string;
    githubInstallationId: number;
    accountLogin: string;
    accountType: 'Organization' | 'User';
    status?: InstallationStatus;
  }) {
    super(params.id);
    this.githubInstallationId = params.githubInstallationId;
    this.accountLogin = params.accountLogin;
    this.accountType = params.accountType;
    this._status = params.status ?? InstallationStatus.active();
  }

  static create(params: {
    githubInstallationId: number;
    accountLogin: string;
    accountType: 'Organization' | 'User';
  }): Installation {
    return new Installation(params);
  }

  static reconstitute(params: {
    id: string;
    githubInstallationId: number;
    accountLogin: string;
    accountType: 'Organization' | 'User';
    status: InstallationStatusValue;
  }): Installation {
    return new Installation({
      id: params.id,
      githubInstallationId: params.githubInstallationId,
      accountLogin: params.accountLogin,
      accountType: params.accountType,
      status:
        params.status === InstallationStatusValue.ACTIVE
          ? InstallationStatus.active()
          : InstallationStatus.inactive(),
    });
  }

  get status(): InstallationStatus {
    return this._status;
  }

  deactivate(): void {
    this._status = InstallationStatus.inactive();
    this.updatedAt = new Date();
  }

  activate(): void {
    this._status = InstallationStatus.active();
    this.updatedAt = new Date();
  }
}
