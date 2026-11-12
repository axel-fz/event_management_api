import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: 'hashed_password',
    createdAt: new Date(),
    updatedAt: new Date(),
    normalizeEmail: jest.fn(),
  };

  beforeEach(async () => {
    const mockRepo = {
      findOne: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ ...dto, id: 'user-uuid-1' })),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  it('should find user by id', async () => {
    repository.findOne.mockResolvedValue(mockUser);
    const result = await service.findById('user-uuid-1');
    expect(result).toEqual(mockUser);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'user-uuid-1' },
    });
  });

  it('should find user by email normalized', async () => {
    repository.findOne.mockResolvedValue(mockUser);
    const result = await service.findByEmail('  TEST@Example.com ');
    expect(result).toEqual(mockUser);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('should create and save user with trimmed fields', async () => {
    repository.create.mockReturnValue(mockUser);
    repository.save.mockResolvedValue(mockUser);

    const result = await service.create({
      email: '  test@example.com ',
      name: ' Test User ',
      passwordHash: 'hashed_password',
    });

    expect(result).toEqual(mockUser);
    expect(repository.create).toHaveBeenCalledWith({
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: 'hashed_password',
    });
  });
});
