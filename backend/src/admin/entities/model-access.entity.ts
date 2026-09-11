import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum AccessPermission {
  ALLOW = 'allow',
  DENY = 'deny',
}

@Entity('model_access')
@Unique(['userId', 'model'])
export class ModelAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column()
  model: string;

  @Column({ type: 'enum', enum: AccessPermission })
  permission: AccessPermission;

  @Column({ name: 'granted_by', nullable: true })
  grantedBy: string;

  @CreateDateColumn({ name: 'granted_at' })
  grantedAt: Date;
}
