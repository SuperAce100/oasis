export class MCPError extends Error {
  public readonly code: string;
  public readonly retryAfter?: number;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    retryAfter?: number,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'MCPError';
    this.code = code;
    this.retryAfter = retryAfter;
    this.details = details;
  }
}

export function BAD_REQUEST(message: string, details?: Record<string, any>): MCPError {
  return new MCPError(message, 'BAD_REQUEST', undefined, details);
}

export function UNAUTHORIZED(message: string): MCPError {
  return new MCPError(message, 'UNAUTHORIZED');
}

export function NOT_FOUND(message: string): MCPError {
  return new MCPError(message, 'NOT_FOUND');
}

export function RATE_LIMIT(message: string, retryAfter: number): MCPError {
  return new MCPError(message, 'RATE_LIMIT', retryAfter);
}

export function INTERNAL_ERROR(message: string, details?: Record<string, any>): MCPError {
  return new MCPError(message, 'INTERNAL_ERROR', undefined, details);
}