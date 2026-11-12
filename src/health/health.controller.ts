import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

export class HealthResponseDto {
  status!: string;
  timestamp!: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns API operational status and current timestamp.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service is operational',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: {
          type: 'string',
          example: '2026-11-12T12:00:00.000Z',
        },
      },
    },
  })
  check(): HealthResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
