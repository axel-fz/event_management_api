import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventOwnerSummaryDto {
  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  id!: string;

  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @ApiProperty({ example: 'john@example.com' })
  email!: string;
}

export class EventResponseDto {
  @ApiProperty({ example: 'c102f1ee-6c54-4b01-90e6-d701748f0899' })
  id!: string;

  @ApiProperty({ example: 'Tech Conference 2026' })
  title!: string;

  @ApiProperty({ example: 'Annual developer conference.' })
  description!: string;

  @ApiProperty({ example: 'Convention Center, San Francisco, CA' })
  location!: string;

  @ApiProperty({ example: '2026-12-01T09:00:00.000Z' })
  startDate!: Date;

  @ApiProperty({ example: '2026-12-03T18:00:00.000Z' })
  endDate!: Date;

  @ApiProperty({ example: 250 })
  capacity!: number;

  @ApiProperty({ example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' })
  ownerId!: string;

  @ApiProperty({ example: 10, description: 'Number of active registrations' })
  registeredCount!: number;

  @ApiProperty({
    example: 240,
    description: 'Remaining spots (capacity - registeredCount)',
  })
  availableSpots!: number;

  @ApiPropertyOptional({
    example: false,
    description:
      'Indicates whether the current requesting user is registered for this event',
  })
  isRegistered?: boolean;

  @ApiPropertyOptional({
    type: () => EventOwnerSummaryDto,
    description: 'Event creator details',
  })
  owner?: EventOwnerSummaryDto;

  @ApiProperty({ example: '2026-11-12T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-11-12T12:00:00.000Z' })
  updatedAt!: Date;
}
