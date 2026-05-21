export interface PaginationMeta {
  count: number;
  page: number | null;
  limit: number | null;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
