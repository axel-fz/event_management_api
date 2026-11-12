import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty({
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    description: 'Unique user identifier (UUID)',
  })
  id!: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email!: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  name!: string;

  @ApiProperty({
    example: '2026-11-12T12:00:00.000Z',
    description: 'Account creation timestamp',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-11-12T12:00:00.000Z',
    description: 'Account last update timestamp',
  })
  updatedAt!: Date;

  static fromEntity(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
