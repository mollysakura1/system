export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedResult<T> {
  list: T[];
  total: number;
}
