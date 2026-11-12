import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';
import { Registration } from '../registrations/entities/registration.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

describe('EventsService', () => {
  let eventsService: EventsService;
  let eventRepository: jest.Mocked<Repository<Event>>;
  let registrationRepository: jest.Mocked<Repository<Registration>>;

  const mockOwnerId = 'owner-uuid-1';
  const mockOtherUserId = 'other-user-uuid-2';
  const mockEventId = 'event-uuid-10';

  const futureStartDate = new Date(Date.now() + 86400000 * 2); // 2 days in future
  const futureEndDate = new Date(Date.now() + 86400000 * 4); // 4 days in future

  const mockEvent: Event = {
    id: mockEventId,
    title: 'Test Conference',
    description: 'Conference details',
    location: 'Paris, France',
    startDate: futureStartDate,
    endDate: futureEndDate,
    capacity: 100,
    ownerId: mockOwnerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockEventRepo = {
      create: jest
        .fn()
        .mockImplementation((dto) => ({ ...dto, id: mockEventId })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      remove: jest.fn().mockResolvedValue(mockEvent),
      createQueryBuilder: jest.fn(),
    };

    const mockRegRepo = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getRepositoryToken(Event),
          useValue: mockEventRepo,
        },
        {
          provide: getRepositoryToken(Registration),
          useValue: mockRegRepo,
        },
      ],
    }).compile();

    eventsService = module.get<EventsService>(EventsService);
    eventRepository = module.get(getRepositoryToken(Event));
    registrationRepository = module.get(getRepositoryToken(Registration));
  });

  describe('create', () => {
    it('should throw BadRequestException if startDate is in the past', async () => {
      const pastDate = new Date(Date.now() - 3600000);
      const dto: CreateEventDto = {
        title: 'Past Event',
        description: 'Past event description',
        location: 'Online',
        startDate: pastDate,
        endDate: futureEndDate,
        capacity: 50,
      };

      await expect(eventsService.create(mockOwnerId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if endDate is before or equal to startDate', async () => {
      const dto: CreateEventDto = {
        title: 'Invalid Date Event',
        description: 'Event description',
        location: 'Online',
        startDate: futureEndDate,
        endDate: futureStartDate,
        capacity: 50,
      };

      await expect(eventsService.create(mockOwnerId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully create an event when inputs are valid', async () => {
      const dto: CreateEventDto = {
        title: 'Valid Future Event',
        description: 'Valid event description',
        location: 'London',
        startDate: futureStartDate,
        endDate: futureEndDate,
        capacity: 150,
      };

      const result = await eventsService.create(mockOwnerId, dto);
      expect(result.title).toBe(dto.title);
      expect(result.ownerId).toBe(mockOwnerId);
      expect(eventRepository.save).toHaveBeenCalled();
    });
  });

  describe('update (ownership, dates, capacity reduction rule)', () => {
    it('should throw NotFoundException if event does not exist', async () => {
      eventRepository.findOne.mockResolvedValue(null);

      await expect(
        eventsService.update('non-existent-id', mockOwnerId, {
          title: 'Updated',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if updater is not the event owner', async () => {
      eventRepository.findOne.mockResolvedValue({ ...mockEvent });

      await expect(
        eventsService.update(mockEventId, mockOtherUserId, {
          title: 'Hacked Title',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if updated endDate is before or equal to startDate', async () => {
      eventRepository.findOne.mockResolvedValue({ ...mockEvent });
      registrationRepository.count.mockResolvedValue(0);

      const invalidDto: UpdateEventDto = {
        endDate: new Date(futureStartDate.getTime() - 10000),
      };

      await expect(
        eventsService.update(mockEventId, mockOwnerId, invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if capacity is reduced below current registration count', async () => {
      eventRepository.findOne.mockResolvedValue({
        ...mockEvent,
        capacity: 100,
      });
      registrationRepository.count.mockResolvedValue(40); // 40 attendees currently

      const dto: UpdateEventDto = {
        capacity: 35, // reducing capacity below 40
      };

      await expect(
        eventsService.update(mockEventId, mockOwnerId, dto),
      ).rejects.toThrow(ConflictException);
    });

    it('should update event successfully when capacity is >= current registration count', async () => {
      eventRepository.findOne.mockResolvedValue({
        ...mockEvent,
        capacity: 100,
      });
      registrationRepository.count.mockResolvedValue(40);

      const dto: UpdateEventDto = {
        capacity: 50, // 50 >= 40 is valid
        title: 'Updated Conference Title',
      };

      const result = await eventsService.update(mockEventId, mockOwnerId, dto);
      expect(result.title).toBe('Updated Conference Title');
      expect(result.capacity).toBe(50);
    });
  });

  describe('remove (ownership)', () => {
    it('should throw ForbiddenException if user is not the owner', async () => {
      eventRepository.findOne.mockResolvedValue({ ...mockEvent });

      await expect(
        eventsService.remove(mockEventId, mockOtherUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delete successfully when called by owner', async () => {
      eventRepository.findOne.mockResolvedValue({ ...mockEvent });

      await expect(
        eventsService.remove(mockEventId, mockOwnerId),
      ).resolves.not.toThrow();
      expect(eventRepository.remove).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe('listAttendees (ownership)', () => {
    it('should throw ForbiddenException when requested by non-owner', async () => {
      eventRepository.findOne.mockResolvedValue({ ...mockEvent });

      await expect(
        eventsService.listAttendees(mockEventId, mockOtherUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return attendees list when requested by owner', async () => {
      eventRepository.findOne.mockResolvedValue({ ...mockEvent });
      registrationRepository.find.mockResolvedValue([
        {
          id: 'reg-1',
          userId: 'user-1',
          eventId: mockEventId,
          createdAt: new Date(),
          user: {
            id: 'user-1',
            email: 'attendee@example.com',
            name: 'Attendee One',
            passwordHash: 'hash',
            createdAt: new Date(),
            updatedAt: new Date(),
            normalizeEmail: jest.fn(),
          },
        },
      ]);

      const attendees = await eventsService.listAttendees(
        mockEventId,
        mockOwnerId,
      );
      expect(attendees).toHaveLength(1);
      expect(attendees[0].email).toBe('attendee@example.com');
    });
  });
});
