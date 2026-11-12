import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Event } from '../../events/entities/event.entity';

@Entity('registrations')
@Unique('UQ_registrations_user_event', ['userId', 'eventId'])
export class Registration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  eventId!: string;

  @ManyToOne(() => User, (user) => user.registrations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @ManyToOne(() => Event, (event) => event.registrations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'eventId' })
  event?: Event;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
