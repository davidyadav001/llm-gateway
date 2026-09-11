import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AiRequest } from './ai-request.entity';

export enum PolicyAction {
  BLOCKED = 'blocked',
  FLAGGED = 'flagged',
  ALLOWED_WITH_WARNING = 'allowed_with_warning',
}

export enum PolicyRule {
  NO_ROLE_PERMISSION = 'no_role_permission',
  NO_PERMISSION = 'no_permission',
  RATE_LIMIT = 'rate_limit',
  DISALLOWED_CATEGORY = 'disallowed_category',
}

@Entity('policy_events')
export class PolicyEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AiRequest, { onDelete: 'CASCADE', nullable: true })
  request: AiRequest;

  @Column({ name: 'request_id', nullable: true, type: 'varchar' })
  requestId: string | null;

  // Kept even when there's no associated ai_requests row (e.g. a blocked
  // request that failed before an AiRequest could be created) so we always
  // know which user and rule triggered it.
  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId: string;

  @Column({ name: 'rule_triggered', type: 'enum', enum: PolicyRule })
  @Index()
  ruleTriggered: PolicyRule;

  @Column({ type: 'enum', enum: PolicyAction })
  action: PolicyAction;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
