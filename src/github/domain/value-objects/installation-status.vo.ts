import { ValueObject } from '../../../shared/domain/value-object.base.js';

export enum InstallationStatusValue {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

interface InstallationStatusProps {
  value: InstallationStatusValue;
}

export class InstallationStatus extends ValueObject<InstallationStatusProps> {
  private constructor(props: InstallationStatusProps) {
    super(props);
  }

  static active(): InstallationStatus {
    return new InstallationStatus({ value: InstallationStatusValue.ACTIVE });
  }

  static inactive(): InstallationStatus {
    return new InstallationStatus({ value: InstallationStatusValue.INACTIVE });
  }

  get value(): InstallationStatusValue {
    return this.props.value;
  }

  get isActive(): boolean {
    return this.props.value === InstallationStatusValue.ACTIVE;
  }
}
