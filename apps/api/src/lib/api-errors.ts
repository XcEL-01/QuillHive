export function getApiErrorMessage(status: number, message?: string): string {
  return status >= 500 ? "Internal server error" : message || "Request failed";
}