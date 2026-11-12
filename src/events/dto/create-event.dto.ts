import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({
    example: 'Tech Conference 2026',
    description: 'Title of the event (3 to 150 characters)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(150, { message: 'Title must not exceed 150 characters' })
  title!: string;

  @ApiProperty({
    example: 'Annual developer conference covering cloud native technologies.',
    description: 'Event description (max 5000 characters)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  description!: string;

  @ApiProperty({
    example: 'Convention Center, San Francisco, CA',
    description: 'Event location venue or address',
  })
  @IsString()
  @IsNotEmpty({ message: 'Location is required' })
  @MaxLength(255, { message: 'Location must not exceed 255 characters' })
  location!: string;

  @ApiProperty({
    example: '2026-12-01T09:00:00.000Z',
    description: 'Event start date and time (must be in the future)',
  })
  @Type(() => Date)
  @IsDate({ message: 'startDate must be a valid ISO-8601 date' })
  startDate!: Date;

  @ApiProperty({
    example: '2026-12-03T18:00:00.000Z',
    description: 'Event end date and time (must be after startDate)',
  })
  @Type(() => Date)
  @IsDate({ message: 'endDate must be a valid ISO-8601 date' })
  endDate!: Date;

  @ApiProperty({
    example: 250,
    description: 'Maximum attendee capacity (1 to 100000)',
    minimum: 1,
    maximum: 100000,
  })
  @Type(() => Number)
  @IsInt({ message: 'Capacity must be an integer' })
  @Min(1, { message: 'Capacity must be at least 1' })
  @Max(100000, { message: 'Capacity cannot exceed 100000' })
  capacity!: number;
}
