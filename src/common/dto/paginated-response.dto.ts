import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 42, description: 'Total number of items' })
  total!: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page!: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit!: number;

  @ApiProperty({ example: 5, description: 'Total number of pages' })
  totalPages!: number;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true, description: 'List of items' })
  data!: T[];

  @ApiProperty({
    type: () => PaginationMetaDto,
    description: 'Pagination metadata',
  })
  meta!: PaginationMetaDto;

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
