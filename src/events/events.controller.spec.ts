import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';
import { EventResponseDto } from './dto/event-response.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

describe('EventsController', () => {
  let controller: EventsController;
  let service: jest.Mocked<EventsService>;

  const mockResponse: EventResponseDto = {
    id: 'e-1',
    title: 'Conference',
    description: 'Tech event',
    location: 'Online',
    startDate: new Date(),
    endDate: new Date(),
    capacity: 100,
    ownerId: 'u-1',
    registeredCount: 0,
    availableSpots: 100,
    isRegistered: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findMine: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      listAttendees: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    service = module.get(EventsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create an event', async () => {
    service.create.mockResolvedValue({ id: 'e-1' } as unknown as Event);
    service.findOne.mockResolvedValue(mockResponse);

    const result = await controller.create('u-1', {
      title: 'Conference',
      description: 'Tech event',
      location: 'Online',
      startDate: new Date(),
      endDate: new Date(),
      capacity: 100,
    });

    expect(result).toEqual(mockResponse);
  });

  it('should list events', async () => {
    const paginated = new PaginatedResponseDto([mockResponse], 1, 1, 10);
    service.findAll.mockResolvedValue(paginated);

    const result = await controller.findAll('u-1', {
      page: 1,
      limit: 10,
      skip: 0,
    });
    expect(result).toEqual(paginated);
  });

  it('should get event by id', async () => {
    service.findOne.mockResolvedValue(mockResponse);
    const result = await controller.findOne('e-1', 'u-1');
    expect(result).toEqual(mockResponse);
  });

  it('should update event', async () => {
    service.update.mockResolvedValue(mockResponse);
    const result = await controller.update('e-1', 'u-1', { title: 'Updated' });
    expect(result).toEqual(mockResponse);
  });

  it('should remove event', async () => {
    service.remove.mockResolvedValue(undefined);
    await expect(controller.remove('e-1', 'u-1')).resolves.toBeUndefined();
  });
});
