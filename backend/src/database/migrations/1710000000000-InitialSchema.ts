import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  name = 'InitialSchema1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Databases created by the former synchronize-based startup already have
    // this schema but no migration history. Baseline those databases safely.
    if (await queryRunner.hasTable('users')) return;

    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(`CREATE TYPE "user_role_enum" AS ENUM ('Researcher', 'Reviewer', 'Admin')`);
    await queryRunner.query(`CREATE TYPE "access_permission_enum" AS ENUM ('allow', 'deny')`);
    await queryRunner.query(`CREATE TYPE "request_status_enum" AS ENUM ('allowed', 'blocked', 'error')`);
    await queryRunner.query(`CREATE TYPE "policy_events_rule_triggered_enum" AS ENUM ('no_role_permission', 'no_permission', 'rate_limit', 'disallowed_category')`);
    await queryRunner.query(`CREATE TYPE "policy_events_action_enum" AS ENUM ('blocked', 'flagged', 'allowed_with_warning')`);

    await queryRunner.query(`CREATE TABLE "users" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL,
      "password_hash" character varying NOT NULL, "role" "user_role_enum" NOT NULL DEFAULT 'Researcher',
      "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_users_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_users_email" UNIQUE ("email")
    )`);
    await queryRunner.query(`CREATE TABLE "refresh_tokens" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying NOT NULL,
      "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked" boolean NOT NULL DEFAULT false,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_refresh_tokens_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE TABLE "model_access" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "model" character varying NOT NULL,
      "permission" "access_permission_enum" NOT NULL, "granted_by" uuid, "granted_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_model_access_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_model_access_user_model" UNIQUE ("user_id", "model"),
      CONSTRAINT "FK_model_access_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE TABLE "ai_requests" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "model" character varying NOT NULL,
      "prompt_hash" character varying NOT NULL, "prompt_excerpt" character varying(120),
      "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "status" "request_status_enum" NOT NULL,
      "token_usage" integer, "latency_ms" integer, CONSTRAINT "PK_ai_requests_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_ai_requests_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(`CREATE TABLE "policy_events" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "request_id" uuid, "user_id" uuid,
      "rule_triggered" "policy_events_rule_triggered_enum" NOT NULL, "action" "policy_events_action_enum" NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_policy_events_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_policy_events_request" FOREIGN KEY ("request_id") REFERENCES "ai_requests"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query('CREATE INDEX "IDX_model_access_user_id" ON "model_access" ("user_id")');
    await queryRunner.query('CREATE INDEX "IDX_ai_requests_user_id" ON "ai_requests" ("user_id")');
    await queryRunner.query('CREATE INDEX "IDX_ai_requests_model" ON "ai_requests" ("model")');
    await queryRunner.query('CREATE INDEX "IDX_ai_requests_timestamp" ON "ai_requests" ("timestamp")');
    await queryRunner.query('CREATE INDEX "IDX_ai_requests_status" ON "ai_requests" ("status")');
    await queryRunner.query('CREATE INDEX "IDX_policy_events_user_id" ON "policy_events" ("user_id")');
    await queryRunner.query('CREATE INDEX "IDX_policy_events_rule_triggered" ON "policy_events" ("rule_triggered")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "policy_events"');
    await queryRunner.query('DROP TABLE "ai_requests"');
    await queryRunner.query('DROP TABLE "model_access"');
    await queryRunner.query('DROP TABLE "refresh_tokens"');
    await queryRunner.query('DROP TABLE "users"');
    await queryRunner.query('DROP TYPE "policy_events_action_enum"');
    await queryRunner.query('DROP TYPE "policy_events_rule_triggered_enum"');
    await queryRunner.query('DROP TYPE "request_status_enum"');
    await queryRunner.query('DROP TYPE "access_permission_enum"');
    await queryRunner.query('DROP TYPE "user_role_enum"');
  }
}