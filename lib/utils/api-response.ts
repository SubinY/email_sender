import { NextResponse } from 'next/server';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  offset: number;
}

/**
 * 成功响应
 */
export function successResponse<T>(
  data: T,
  pagination?: PaginationInfo,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString()
    }
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return NextResponse.json(response, { status });
}

/**
 * 错误响应
 */
export function errorResponse(
  code: string,
  message: string,
  details?: any,
  status: number = 400
): NextResponse<ApiResponse> {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details: process.env.NODE_ENV === 'development' ? details : undefined
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };

  return NextResponse.json(response, { status });
}

/**
 * 验证错误响应
 */
export function validationErrorResponse(
  errors: Record<string, string[]>
): NextResponse<ApiResponse> {
  return errorResponse(
    'VALIDATION_ERROR',
    '输入数据验证失败',
    errors,
    400
  );
}

/**
 * 未认证响应
 */
export function unauthorizedResponse(
  message: string = '未认证或令牌无效'
): NextResponse<ApiResponse> {
  return errorResponse(
    'UNAUTHORIZED',
    message,
    undefined,
    401
  );
}

/**
 * 权限不足响应
 */
export function forbiddenResponse(
  message: string = '权限不足'
): NextResponse<ApiResponse> {
  return errorResponse(
    'FORBIDDEN',
    message,
    undefined,
    403
  );
}

/**
 * 资源不存在响应
 */
export function notFoundResponse(
  resource: string = '资源'
): NextResponse<ApiResponse> {
  return errorResponse(
    'NOT_FOUND',
    `${resource}不存在`,
    undefined,
    404
  );
}

/**
 * 服务器内部错误响应
 */
export function internalErrorResponse(
  message: string = '服务器内部错误',
  details?: any
): NextResponse<ApiResponse> {
  return errorResponse(
    'INTERNAL_ERROR',
    message,
    details,
    500
  );
}

/**
 * 计算分页信息
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationInfo {
  const totalPages = Math.ceil(total / limit);
  const validPage = Math.max(1, Math.min(page, totalPages || 1));
  
  return {
    page: validPage,
    limit,
    total,
    totalPages,
    offset: (validPage - 1) * limit
  };
} 