import { ValueObject } from '../../../shared/domain/value-object.base.js';

interface DeliveryIdProps {
  value: string;
}

export class DeliveryId extends ValueObject<DeliveryIdProps> {
  private constructor(props: DeliveryIdProps) {
    super(props);
  }

  static create(value: string): DeliveryId {
    if (!value || value.trim().length === 0) {
      throw new Error('DeliveryId cannot be empty');
    }
    return new DeliveryId({ value });
  }

  get value(): string {
    return this.props.value;
  }
}
