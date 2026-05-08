import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewProgressColumns1778240000000 implements MigrationInterface {
  name = 'AddReviewProgressColumns1778240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "reviews" ADD COLUMN "progress_comment_id" bigint NULL, ADD COLUMN "check_run_id" bigint NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "reviews" DROP COLUMN "check_run_id", DROP COLUMN "progress_comment_id"',
    );
  }
}
