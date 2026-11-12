import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { Registration } from '../registrations/entities/registration.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Registration)
    private readonly registrationRepository: Repository<Registration>,
  ) {}

  async create(userId: string, dto: CreateEventDto): Promise<Event> {
    const now = new Date();
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate <= now) {
      throw new BadRequestException('Event startDate must be in the future');
    }

    if (endDate <= startDate) {
      throw new BadRequestException('Event endDate must be after startDate');
    }

    const event = this.eventRepository.create({
      title: dto.title,
      description: dto.description,
      location: dto.location,
      startDate,
      endDate,
      capacity: dto.capacity,
      ownerId: userId,
    });

    return this.eventRepository.save(event);
  }

  async findAll(
    userId: string,
    query: QueryEventsDto,
  ): Promise<PaginatedResponseDto<EventResponseDto>> {
    const qb = this.eventRepository.createQueryBuilder('event');

    if (query.search) {
      const keyword = `%${query.search.toLowerCase().trim()}%`;
      qb.andWhere(
        '(LOWER(event.title) LIKE :keyword OR LOWER(event.location) LIKE :keyword)',
        { keyword },
      );
    }

    if (query.from) {
      qb.andWhere('event.startDate >= :from', {
        from: new Date(query.from),
      });
    }

    if (query.to) {
      qb.andWhere('event.startDate <= :to', {
        to: new Date(query.to),
      });
    }

    if (query.upcoming) {
      qb.andWhere('event.startDate >= :now', {
        now: new Date(),
      });
    }

    qb.orderBy('event.startDate', 'ASC');

    const total = await qb.getCount();
    qb.skip(query.skip).take(query.limit);

    const events = await qb.getMany();

    const dtos = await Promise.all(
      events.map((event) => this.mapToEventResponse(event, userId)),
    );

    return new PaginatedResponseDto(dtos, total, query.page, query.limit);
  }

  async findMine(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<EventResponseDto>> {
    const [events, total] = await this.eventRepository.findAndCount({
      where: { ownerId: userId },
      order: { startDate: 'ASC' },
      skip: query.skip,
      take: query.limit,
    });

    const dtos = await Promise.all(
      events.map((event) => this.mapToEventResponse(event, userId)),
    );

    return new PaginatedResponseDto(dtos, total, query.page, query.limit);
  }

  async findOne(id: string, userId?: string): Promise<EventResponseDto> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${id}" not found`);
    }

    return this.mapToEventResponse(event, userId, true);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    const event = await this.eventRepository.findOne({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${id}" not found`);
    }

    this.assertOwner(event, userId);

    const currentRegistrationsCount = await this.registrationRepository.count({
      where: { eventId: id },
    });

    if (
      dto.capacity !== undefined &&
      dto.capacity < currentRegistrationsCount
    ) {
      throw new ConflictException(
        `Cannot reduce capacity to ${dto.capacity} because there are already ${currentRegistrationsCount} registered attendees`,
      );
    }

    const nextStartDate =
      dto.startDate !== undefined ? new Date(dto.startDate) : event.startDate;
    const nextEndDate =
      dto.endDate !== undefined ? new Date(dto.endDate) : event.endDate;

    if (nextEndDate <= nextStartDate) {
      throw new BadRequestException('Event endDate must be after startDate');
    }

    Object.assign(event, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.startDate !== undefined && { startDate: nextStartDate }),
      ...(dto.endDate !== undefined && { endDate: nextEndDate }),
      ...(dto.capacity !== undefined && { capacity: dto.capacity }),
    });

    const updated = await this.eventRepository.save(event);
    return this.mapToEventResponse(updated, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const event = await this.eventRepository.findOne({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${id}" not found`);
    }

    this.assertOwner(event, userId);

    await this.eventRepository.remove(event);
  }

  async listAttendees(id: string, userId: string): Promise<UserResponseDto[]> {
    const event = await this.eventRepository.findOne({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${id}" not found`);
    }

    this.assertOwner(event, userId);

    const registrations = await this.registrationRepository.find({
      where: { eventId: id },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    return registrations
      .map((reg) => reg.user)
      .filter((user): user is NonNullable<typeof user> => user !== undefined)
      .map((user) => UserResponseDto.fromEntity(user));
  }

  private assertOwner(event: Event, userId: string): void {
    if (event.ownerId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to perform this action on this event',
      );
    }
  }

  private async mapToEventResponse(
    event: Event,
    userId?: string,
    includeOwnerDetails = false,
  ): Promise<EventResponseDto> {
    const registeredCount = await this.registrationRepository.count({
      where: { eventId: event.id },
    });

    let isRegistered = false;
    if (userId) {
      const userReg = await this.registrationRepository.findOne({
        where: { eventId: event.id, userId },
      });
      isRegistered = !!userReg;
    }

    const availableSpots = Math.max(0, event.capacity - registeredCount);

    const response: EventResponseDto = {
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      capacity: event.capacity,
      ownerId: event.ownerId,
      registeredCount,
      availableSpots,
      isRegistered,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };

    if (includeOwnerDetails && event.owner) {
      response.owner = {
        id: event.owner.id,
        name: event.owner.name,
        email: event.owner.email,
      };
    }

    return response;
  }
}
