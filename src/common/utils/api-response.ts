export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export const buildSuccessResponse = <T>(
  message: string,
  data?: T,
): ApiResponse<T> => ({
  success: true,
  message,
  data,
});
