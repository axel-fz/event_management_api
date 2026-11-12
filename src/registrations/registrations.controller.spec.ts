import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { Registration } from './entities/registration.entity';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';

describe('RegistrationsController', () => {
  let controller: RegistrationsController;
  let service: jest.Mocked<RegistrationsService>;

  const mockRegistration: Registration = {
    id: 'r-1',
    userId: 'u-1',
    eventId: 'e-1',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      register: jest.fn(),
      cancel: jest.fn(),
      findMine: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistrationsController],
      providers: [
        {
          provide: RegistrationsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<RegistrationsController>(RegistrationsController);
    service = module.get(RegistrationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should register for an event', async () => {
    service.register.mockResolvedValue(mockRegistration);

    const result = await controller.register('e-1', 'u-1');
    expect(result.id).toBe('r-1');
    expect(service.register).toHaveBeenCalledWith('e-1', 'u-1');
  });

  it('should cancel registration', async () => {
    service.cancel.mockResolvedValue(undefined);

    await expect(controller.cancel('e-1', 'u-1')).resolves.toBeUndefined();
    expect(service.cancel).toHaveBeenCalledWith('e-1', 'u-1');
  });

  it('should return my registrations', async () => {
    const paginated = new PaginatedResponseDto(
      [{ id: 'r-1', userId: 'u-1', eventId: 'e-1', createdAt: new Date() }],
      1,
      1,
      10,
    );
    service.findMine.mockResolvedValue(paginated);

    const result = await controller.findMine('u-1', {
      page: 1,
      limit: 10,
      skip: 0,
    });
    expect(result).toEqual(paginated);
  });
});
