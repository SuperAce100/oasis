export interface LogContext {
  traceId: string;
}

export function redactSensitiveData(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('token') || lowerKey.includes('auth') || lowerKey.includes('password')) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redactSensitiveData(value);
    }
  }
  return result;
}

export function logStart(context: LogContext, toolName: string, args: any): void {
  const redactedArgs = redactSensitiveData(args);
  console.log(`[${context.traceId}] START ${toolName} args=${JSON.stringify(redactedArgs)}`);
}

export function logSuccess(context: LogContext, toolName: string, latencyMs: number): void {
  console.log(`[${context.traceId}] OK ${toolName} latency_ms=${latencyMs}`);
}

export function logError(context: LogContext, toolName: string, error: Error, latencyMs: number): void {
  console.log(`[${context.traceId}] ERR ${toolName} latency_ms=${latencyMs} error=${error.message}`);
}

export function emitProgress(step: number, total: number, note?: string): void {
  const noteText = note ? ` ${note}` : '';
  console.log(`PROGRESS:${step}/${total}${noteText}`);
}