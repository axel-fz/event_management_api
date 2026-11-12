import { ApiProperty } from '@nestjs/swagger';
import { EventResponseDto } from '../../events/dto/event-response.dto';

export class RegistrationResponseDto {
  @ApiProperty({
    example: 'a571e2ef-1234-4567-8901-abcdef123456',
    description: 'Unique registration identifier (UUID)',
  })
  id!: string;

  @ApiProperty({
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    description: 'User ID of the registrant',
  })
  userId!: string;

  @ApiProperty({
    example: 'c102f1ee-6c54-4b01-90e6-d701748f0899',
    description: 'Event ID',
  })
  eventId!: string;

  @ApiProperty({
    example: '2026-11-12T12:00:00.000Z',
    description: 'Timestamp when the registration was created',
  })
  createdAt!: Date;

  @ApiProperty({
    type: () => EventResponseDto,
    description: 'Registered event details',
  })
  event?: EventResponseDto;
}
