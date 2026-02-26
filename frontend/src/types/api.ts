export type ApiSuccess<T> = {
  success: true;
  data: T;
  error: null;
};

export type ApiFailure = {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;
