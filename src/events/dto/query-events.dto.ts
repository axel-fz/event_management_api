import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryEventsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter events by keyword matching title or location',
    example: 'San Francisco',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter events starting on or after this ISO-8601 date',
    example: '2026-11-01T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({
    description: 'Filter events starting on or before this ISO-8601 date',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @ApiPropertyOptional({
    description:
      'Filter for upcoming events only (where startDate is in the future)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === 1 || value === '1') {
      return true;
    }
    if (value === 'false' || value === false || value === 0 || value === '0') {
      return false;
    }
    return undefined;
  })
  @IsBoolean()
  upcoming?: boolean;
}
