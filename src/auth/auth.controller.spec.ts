import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      getMe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should register a new user', async () => {
    const responseDto: AuthResponseDto = {
      accessToken: 'token123',
      user: {
        id: 'u-1',
        email: 'test@example.com',
        name: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
    authService.register.mockResolvedValue(responseDto);

    const result = await controller.register({
      email: 'test@example.com',
      name: 'Test',
      password: 'Password123',
    });

    expect(result).toEqual(responseDto);
    expect(authService.register).toHaveBeenCalled();
  });

  it('should log in an existing user', async () => {
    authService.login.mockResolvedValue({ accessToken: 'jwt-login-token' });

    const result = await controller.login({
      email: 'test@example.com',
      password: 'Password123',
    });

    expect(result.accessToken).toBe('jwt-login-token');
  });

  it('should return current user profile', async () => {
    const userDto = {
      id: 'u-1',
      email: 'test@example.com',
      name: 'Test',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    authService.getMe.mockResolvedValue(userDto);

    const result = await controller.me('u-1');
    expect(result).toEqual(userDto);
  });
});
