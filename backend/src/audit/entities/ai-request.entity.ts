import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum RequestStatus {
  ALLOWED = 'allowed',
  BLOCKED = 'blocked',
  ERROR = 'error',
}

// Deliberately does NOT store the raw prompt. See README "Privacy trade-off".
// prompt_hash lets admins correlate repeated/identical prompts across users
// for abuse investigation without retaining full user content at rest.
@Entity('ai_requests')
export class AiRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  user: User;

  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId: string;

  @Column()
  @Index()
  model: string;

  @Column({ name: 'prompt_hash' })
  promptHash: string;

  // Optional short excerpt (max ~100 chars), only populated when the policy
  // check did not flag the prompt. Never the full prompt.
  @Column({ name: 'prompt_excerpt', type: 'varchar', length: 120, nullable: true })
  promptExcerpt: string | null;

  @CreateDateColumn({ name: 'timestamp' })
  @Index()
  timestamp: Date;

  @Column({ type: 'enum', enum: RequestStatus })
  @Index()
  status: RequestStatus;

  @Column({ name: 'token_usage', type: 'int', nullable: true })
  tokenUsage: number | null;

  @Column({ name: 'latency_ms', type: 'int', nullable: true })
  latencyMs: number | null;
}
