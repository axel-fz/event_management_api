import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RegistrationsService } from './registrations.service';
import { RegistrationResponseDto } from './dto/registration-response.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponseDto } from '../common/dto/paginated-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Registrations')
@ApiBearerAuth()
@Controller()
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Post('events/:id/registrations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register for an event',
    description:
      'Registers the authenticated user for the specified event using pessimistic locking for race-condition safety.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Registration successful',
    type: RegistrationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Event has already ended or invalid UUID format',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication token missing or invalid',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User already registered or event is at full capacity',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async register(
    @Param('id', new ParseUUIDPipe({ version: '4' })) eventId: string,
    @CurrentUser('id') userId: string,
  ): Promise<RegistrationResponseDto> {
    const registration = await this.registrationsService.register(
      eventId,
      userId,
    );
    return {
      id: registration.id,
      userId: registration.userId,
      eventId: registration.eventId,
      createdAt: registration.createdAt,
    };
  }

  @Delete('events/:id/registrations')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel registration for an event',
    description:
      'Cancels the authenticated user registration for the specified event.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Registration cancelled successfully',
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
    description: 'Registration not found for this event',
  })
  async cancel(
    @Param('id', new ParseUUIDPipe({ version: '4' })) eventId: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    return this.registrationsService.cancel(eventId, userId);
  }

  @Get('users/me/registrations')
  @ApiOperation({
    summary: 'List my event registrations',
    description:
      'Retrieves a paginated list of events the authenticated user has registered for.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of registrations retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication token missing or invalid',
  })
  async findMine(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<RegistrationResponseDto>> {
    return this.registrationsService.findMine(userId, query);
  }
}
