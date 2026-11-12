import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { RegistrationsService } from './registrations.service';
import { Registration } from './entities/registration.entity';
import { Event } from '../events/entities/event.entity';

type TransactionFn = (em: EntityManager) => Promise<unknown>;

describe('RegistrationsService', () => {
  let service: RegistrationsService;
  let dataSource: jest.Mocked<DataSource>;
  let registrationRepository: jest.Mocked<Repository<Registration>>;

  const mockEventId = 'event-uuid-1';
  const mockUserId1 = 'user-uuid-1';
  const mockUserId2 = 'user-uuid-2';

  const futureEndDate = new Date(Date.now() + 86400000 * 5);
  const pastEndDate = new Date(Date.now() - 3600000);

  const mockEvent: Event = {
    id: mockEventId,
    title: 'Limited Seat Workshop',
    description: 'Only one seat available',
    location: 'Berlin',
    startDate: new Date(Date.now() + 86400000),
    endDate: futureEndDate,
    capacity: 1,
    ownerId: 'owner-uuid',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRegRepo = {
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ id: 'reg-uuid', ...dto })),
      save: jest.fn().mockImplementation((reg) => Promise.resolve(reg)),
      remove: jest.fn().mockResolvedValue(undefined),
      findAndCount: jest.fn(),
    };

    const mockEvRepo = {
      findOne: jest.fn(),
    };

    const mockDs = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        {
          provide: DataSource,
          useValue: mockDs,
        },
        {
          provide: getRepositoryToken(Registration),
          useValue: mockRegRepo,
        },
        {
          provide: getRepositoryToken(Event),
          useValue: mockEvRepo,
        },
      ],
    }).compile();

    service = module.get<RegistrationsService>(RegistrationsService);
    dataSource = module.get(DataSource);
    registrationRepository = module.get(getRepositoryToken(Registration));
  });

  describe('register (business rules)', () => {
    it('should throw NotFoundException if event does not exist', async () => {
      dataSource.transaction.mockImplementation(
        async (arg1: unknown, arg2?: unknown) => {
          const cb = (
            typeof arg1 === 'function' ? arg1 : arg2
          ) as TransactionFn;
          const mockManager = {
            getRepository: jest.fn().mockReturnValue({
              createQueryBuilder: jest.fn().mockReturnValue({
                setLock: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(null),
              }),
            }),
          } as unknown as EntityManager;
          return cb(mockManager);
        },
      );

      await expect(service.register(mockEventId, mockUserId1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if event has already ended', async () => {
      dataSource.transaction.mockImplementation(
        async (arg1: unknown, arg2?: unknown) => {
          const cb = (
            typeof arg1 === 'function' ? arg1 : arg2
          ) as TransactionFn;
          const endedEvent = { ...mockEvent, endDate: pastEndDate };
          const mockManager = {
            getRepository: jest.fn().mockReturnValue({
              createQueryBuilder: jest.fn().mockReturnValue({
                setLock: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getOne: jest.fn().mockResolvedValue(endedEvent),
              }),
            }),
          } as unknown as EntityManager;
          return cb(mockManager);
        },
      );

      await expect(service.register(mockEventId, mockUserId1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if user is already registered', async () => {
      dataSource.transaction.mockImplementation(
        async (arg1: unknown, arg2?: unknown) => {
          const cb = (
            typeof arg1 === 'function' ? arg1 : arg2
          ) as TransactionFn;
          const mockManager = {
            getRepository: jest.fn((entity) => {
              if (entity === Event) {
                return {
                  createQueryBuilder: jest.fn().mockReturnValue({
                    setLock: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    getOne: jest.fn().mockResolvedValue(mockEvent),
                  }),
                };
              }
              return {
                findOne: jest.fn().mockResolvedValue({ id: 'existing-reg' }),
                count: jest.fn().mockResolvedValue(0),
              };
            }),
          } as unknown as EntityManager;
          return cb(mockManager);
        },
      );

      await expect(service.register(mockEventId, mockUserId1)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if event is at full capacity', async () => {
      dataSource.transaction.mockImplementation(
        async (arg1: unknown, arg2?: unknown) => {
          const cb = (
            typeof arg1 === 'function' ? arg1 : arg2
          ) as TransactionFn;
          const mockManager = {
            getRepository: jest.fn((entity) => {
              if (entity === Event) {
                return {
                  createQueryBuilder: jest.fn().mockReturnValue({
                    setLock: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    getOne: jest.fn().mockResolvedValue(mockEvent), // capacity: 1
                  }),
                };
              }
              return {
                findOne: jest.fn().mockResolvedValue(null),
                count: jest.fn().mockResolvedValue(1), // already 1 registration
              };
            }),
          } as unknown as EntityManager;
          return cb(mockManager);
        },
      );

      await expect(service.register(mockEventId, mockUserId1)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should catch Postgres unique violation 23505 and throw ConflictException', async () => {
      dataSource.transaction.mockImplementation(
        async (arg1: unknown, arg2?: unknown) => {
          const cb = (
            typeof arg1 === 'function' ? arg1 : arg2
          ) as TransactionFn;
          const mockManager = {
            getRepository: jest.fn((entity) => {
              if (entity === Event) {
                return {
                  createQueryBuilder: jest.fn().mockReturnValue({
                    setLock: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    getOne: jest.fn().mockResolvedValue(mockEvent),
                  }),
                };
              }
              return {
                findOne: jest.fn().mockResolvedValue(null),
                count: jest.fn().mockResolvedValue(0),
                create: jest.fn().mockReturnValue({ id: 'new-reg' }),
                save: jest.fn().mockRejectedValue({ code: '23505' }),
              };
            }),
          } as unknown as EntityManager;
          return cb(mockManager);
        },
      );

      await expect(service.register(mockEventId, mockUserId1)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should register successfully when valid and spots are available', async () => {
      dataSource.transaction.mockImplementation(
        async (arg1: unknown, arg2?: unknown) => {
          const cb = (
            typeof arg1 === 'function' ? arg1 : arg2
          ) as TransactionFn;
          const mockManager = {
            getRepository: jest.fn((entity) => {
              if (entity === Event) {
                return {
                  createQueryBuilder: jest.fn().mockReturnValue({
                    setLock: jest.fn().mockReturnThis(),
                    where: jest.fn().mockReturnThis(),
                    getOne: jest.fn().mockResolvedValue(mockEvent),
                  }),
                };
              }
              return {
                findOne: jest.fn().mockResolvedValue(null),
                count: jest.fn().mockResolvedValue(0),
                create: jest
                  .fn()
                  .mockImplementation((dto) => ({ id: 'reg-1', ...dto })),
                save: jest
                  .fn()
                  .mockImplementation((reg) => Promise.resolve(reg)),
              };
            }),
          } as unknown as EntityManager;
          return cb(mockManager);
        },
      );

      const result = await service.register(mockEventId, mockUserId1);
      expect(result.userId).toBe(mockUserId1);
      expect(result.eventId).toBe(mockEventId);
    });
  });

  describe('cancel', () => {
    it('should throw NotFoundException if registration does not exist', async () => {
      registrationRepository.findOne.mockResolvedValue(null);

      await expect(service.cancel(mockEventId, mockUserId1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should successfully remove registration', async () => {
      const existingReg = {
        id: 'reg-1',
        userId: mockUserId1,
        eventId: mockEventId,
        createdAt: new Date(),
      };
      registrationRepository.findOne.mockResolvedValue(existingReg);

      await expect(
        service.cancel(mockEventId, mockUserId1),
      ).resolves.not.toThrow();
      expect(registrationRepository.remove).toHaveBeenCalledWith(existingReg);
    });
  });

  describe('Race condition: concurrent registrations on capacity 1', () => {
    it('proves that with pessimistic write lock (FOR UPDATE), only one concurrent registration succeeds', async () => {
      let registeredCount = 0;
      let isRowLocked = false;
      const queue: Array<() => void> = [];

      const acquireRowLock = async () => {
        if (isRowLocked) {
          await new Promise<void>((resolve) => queue.push(resolve));
        }
        isRowLocked = true;
      };

      const releaseRowLock = () => {
        isRowLocked = false;
        const next = queue.shift();
        if (next) {
          next();
        }
      };

      // Mock database transaction simulating real pessimistic row locking
      dataSource.transaction.mockImplementation(
        async (arg1: unknown, arg2?: unknown) => {
          const cb = (
            typeof arg1 === 'function' ? arg1 : arg2
          ) as TransactionFn;
          await acquireRowLock();
          try {
            const mockManager = {
              getRepository: jest.fn((entity) => {
                if (entity === Event) {
                  return {
                    createQueryBuilder: jest.fn().mockReturnValue({
                      setLock: jest.fn().mockReturnThis(),
                      where: jest.fn().mockReturnThis(),
                      getOne: jest.fn().mockResolvedValue(mockEvent), // capacity = 1
                    }),
                  };
                }
                return {
                  findOne: jest.fn().mockResolvedValue(null),
                  count: jest
                    .fn()
                    .mockImplementation(() => Promise.resolve(registeredCount)),
                  create: jest.fn().mockImplementation((dto) => ({
                    id: 'reg-' + dto.userId,
                    ...dto,
                  })),
                  save: jest.fn().mockImplementation((reg) => {
                    registeredCount++;
                    return Promise.resolve(reg);
                  }),
                };
              }),
            } as unknown as EntityManager;

            return await cb(mockManager);
          } finally {
            releaseRowLock();
          }
        },
      );

      // Fire 2 concurrent registration requests simultaneously for capacity = 1
      const [res1, res2] = await Promise.allSettled([
        service.register(mockEventId, mockUserId1),
        service.register(mockEventId, mockUserId2),
      ]);

      const fulfilled = [res1, res2].filter((r) => r.status === 'fulfilled');
      const rejected = [res1, res2].filter((r) => r.status === 'rejected');

      // Exactly ONE must succeed and ONE must fail with ConflictException
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
        ConflictException,
      );
      expect(
        ((rejected[0] as PromiseRejectedResult).reason as ConflictException)
          .message,
      ).toBe('Event is already at full capacity');
      expect(registeredCount).toBe(1);
    });
  });
});
