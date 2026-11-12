import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Events')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new event',
    description:
      'Creates a new event with the authenticated user as the owner.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Event created successfully',
    type: EventResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed or invalid start/end dates',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication token missing or invalid',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateEventDto,
  ): Promise<EventResponseDto> {
    const event = await this.eventsService.create(userId, dto);
    return this.eventsService.findOne(event.id, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'List available events',
    description:
      'Retrieves a paginated list of events with optional search, date range, and upcoming filters.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of events retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication token missing or invalid',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: QueryEventsDto,
  ): Promise<PaginatedResponseDto<EventResponseDto>> {
    return this.eventsService.findAll(userId, query);
  }

  @Get('me')
  @ApiOperation({
    summary: 'List events created by current user',
    description:
      'Retrieves a paginated list of events owned by the authenticated user.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'My events retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication token missing or invalid',
  })
  async findMine(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<EventResponseDto>> {
    return this.eventsService.findMine(userId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get event details by ID',
    description:
      'Retrieves comprehensive event details including available spots and registration status for current user.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event details retrieved successfully',
    type: EventResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication token missing or invalid',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event not found',
  })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<EventResponseDto> {
    return this.eventsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an event (owner only)',
    description:
      'Updates event fields. Cannot reduce capacity below current registration count.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event updated successfully',
    type: EventResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payload or invalid dates',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication token missing or invalid',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only the event owner can modify this event',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Capacity cannot be reduced below current attendee count',
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    return this.eventsService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an event (owner only)',
    description: 'Permanently removes an event and cascades deletions.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Event deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication token missing or invalid',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only the event owner can delete this event',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event not found',
  })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.eventsService.remove(id, userId);
  }

  @Get(':id/registrations')
  @ApiOperation({
    summary: 'List attendees for an event (owner only)',
    description:
      'Retrieves the list of registered attendees for an event owned by the caller.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of attendees retrieved successfully',
    type: [UserResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication token missing or invalid',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only the event owner can view attendees',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event not found',
  })
  async listAttendees(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<UserResponseDto[]> {
    return this.eventsService.listAttendees(id, userId);
  }
}
