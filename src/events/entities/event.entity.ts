import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Registration } from '../../registrations/entities/registration.entity';

@Entity('events')
@Index(['startDate'])
@Index(['ownerId'])
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 255 })
  location!: string;

  @Column({ type: 'timestamptz' })
  startDate!: Date;

  @Column({ type: 'timestamptz' })
  endDate!: Date;

  @Column({ type: 'integer' })
  capacity!: number;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => User, (user) => user.ownedEvents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner?: User;

  @OneToMany(() => Registration, (registration) => registration.event)
  registrations?: Registration[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
