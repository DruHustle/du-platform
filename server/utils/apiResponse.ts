export type ApiError = {
  code: string;
  message: string;
};

export const SYSTEM_COMPLIANCE_NOTICE =
  "Payments are powered by licensed financial infrastructure providers. Diaspora Unlocked does not hold customer funds.";

export function successResponse<T>(data: T) {
  return {
    success: true as const,
    data,
    error: null,
  };
}

export function errorResponse(code: string, message: string) {
  return {
    success: false as const,
    data: null,
    error: {
      code,
      message,
    } satisfies ApiError,
  };
}
