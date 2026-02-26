export type SuccessResponse<T> = {
  success: true;
  data: T;
  error: null;
};

export type ErrorResponse = {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function ok<T>(data: T): SuccessResponse<T> {
  return { success: true, data, error: null };
}

export function error(code: string, message: string, details?: unknown): ErrorResponse {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  };
}
