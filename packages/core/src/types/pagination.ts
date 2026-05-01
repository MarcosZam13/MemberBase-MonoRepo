// pagination.ts — Tipos y utilidades compartidas para paginación server-side

// CORE CHANGE: tipos usados en gymbase para paginar todas las tablas de alta carga

export const MAX_PAGE_SIZE = 100;
const MIN_PAGE_SIZE = 1;

export interface PaginationParams {
  page: number;      // 1-indexed
  pageSize: number;  // default 25, máx 100
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;        // total de registros sin paginación
  page: number;
  pageSize: number;
  totalPages: number;   // Math.ceil(total / pageSize)
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Normaliza parámetros de paginación: evita page=0, pageSize=99999, etc.
export function sanitizePaginationParams(params: PaginationParams): PaginationParams {
  return {
    page: Math.max(1, Math.floor(params.page) || 1),
    pageSize: Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, Math.floor(params.pageSize) || 25)),
  };
}

export function buildPaginationRange(params: PaginationParams): { from: number; to: number } {
  const safe = sanitizePaginationParams(params);
  const from = (safe.page - 1) * safe.pageSize;
  const to = from + safe.pageSize - 1;
  return { from, to };
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  const safe = sanitizePaginationParams(params);
  const totalPages = Math.max(1, Math.ceil(total / safe.pageSize));
  return {
    data,
    total,
    page: safe.page,
    pageSize: safe.pageSize,
    totalPages,
    hasNextPage: safe.page < totalPages,
    hasPrevPage: safe.page > 1,
  };
}
