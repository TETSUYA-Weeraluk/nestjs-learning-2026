export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number | null;
  limit: number | null;
  totalPages: number;
}
