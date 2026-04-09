import { randomUUID } from 'node:crypto';

export abstract class BaseEntity {
  readonly id: string;
  readonly createdAt: Date;
  updatedAt: Date;

  protected constructor(id?: string) {
    this.id = id ?? randomUUID();
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  equals(other: BaseEntity): boolean {
    return this.id === other.id;
  }
}
