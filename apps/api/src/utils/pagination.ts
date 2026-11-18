import { paginationMeta, type PaginationMeta } from '@haat/shared';

export interface PageRequest {
  page: number;
  limit: number;
  skip: number;
}

/** Normalises pagination inputs already validated by a Zod query schema. */
export function pageRequest(input: { page?: number; limit?: number }): PageRequest {
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(100, Math.max(1, input.limit ?? 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function pageMeta(request: PageRequest, total: number): PaginationMeta {
  return paginationMeta(request.page, request.limit, total);
}
