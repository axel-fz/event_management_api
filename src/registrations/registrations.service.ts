import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Registration } from './entities/registration.entity';
import { Event } from '../events/entities/event.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { RegistrationResponseDto } from './dto/registration-response.dto';
import { EventResponseDto } from '../events/dto/event-response.dto';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async register(eventId: string, userId: string): Promise<Registration> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Lock event row with pessimistic write lock (FOR UPDATE)
      const event = await manager
        .getRepository(Event)
        .createQueryBuilder('event')
        .setLock('pessimistic_write')
        .where('event.id = :eventId', { eventId })
        .getOne();

      if (!event) {
        throw new NotFoundException(`Event with id "${eventId}" not found`);
      }

      // 2. Cannot register for an event that already ended
      const now = new Date();
      if (new Date(event.endDate) <= now) {
        throw new BadRequestException(
          'Cannot register for an event that has already ended',
        );
      }

      // 3. Cannot register twice
      const existingRegistration = await manager
        .getRepository(Registration)
        .findOne({
          where: { userId, eventId },
        });

      if (existingRegistration) {
        throw new ConflictException(
          'You are already registered for this event',
        );
      }

      // 4. Cannot register when the event is full
      const currentCount = await manager.getRepository(Registration).count({
        where: { eventId },
      });

      if (currentCount >= event.capacity) {
        throw new ConflictException('Event is already at full capacity');
      }

      // 5. Insert registration with safety net for race conditions (Postgres unique violation 23505)
      try {
        const registration = manager.getRepository(Registration).create({
          userId,
          eventId,
        });

        return await manager.getRepository(Registration).save(registration);
      } catch (err: unknown) {
        const errorObj = err as { code?: string };
        if (errorObj?.code === '23505') {
          throw new ConflictException(
            'You are already registered for this event',
          );
        }
        throw err;
      }
    });
  }

  async cancel(eventId: string, userId: string): Promise<void> {
    const registration = await this.registrationRepository.findOne({
      where: { eventId, userId },
    });

    if (!registration) {
      throw new NotFoundException('Registration not found for this event');
    }

    await this.registrationRepository.remove(registration);
  }

  async findMine(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<RegistrationResponseDto>> {
    const [registrations, total] =
      await this.registrationRepository.findAndCount({
        where: { userId },
        relations: ['event', 'event.owner'],
        order: { createdAt: 'DESC' },
        skip: query.skip,
        take: query.limit,
      });

    const dtos: RegistrationResponseDto[] = await Promise.all(
      registrations.map(async (reg) => {
        let eventDto: EventResponseDto | undefined;

        if (reg.event) {
          const registeredCount = await this.registrationRepository.count({
            where: { eventId: reg.event.id },
          });

          eventDto = {
            id: reg.event.id,
            title: reg.event.title,
            description: reg.event.description,
            location: reg.event.location,
            startDate: reg.event.startDate,
            endDate: reg.event.endDate,
            capacity: reg.event.capacity,
            ownerId: reg.event.ownerId,
            registeredCount,
            availableSpots: Math.max(0, reg.event.capacity - registeredCount),
            isRegistered: true,
            createdAt: reg.event.createdAt,
            updatedAt: reg.event.updatedAt,
            ...(reg.event.owner && {
              owner: {
                id: reg.event.owner.id,
                name: reg.event.owner.name,
                email: reg.event.owner.email,
              },
            }),
          };
        }

        return {
          id: reg.id,
          userId: reg.userId,
          eventId: reg.eventId,
          createdAt: reg.createdAt,
          event: eventDto,
        };
      }),
    );

    return new PaginatedResponseDto(dtos, total, query.page, query.limit);
  }
}
