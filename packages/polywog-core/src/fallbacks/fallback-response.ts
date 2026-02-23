import type { AxleResponse } from '../types/modules.js';
import { generateId } from '../utils/ids.js';

export function fallbackResponse(traceId: string, errorNote?: string): AxleResponse {
  return {
    responseId: generateId('resp_fallback'),
    content: errorNote ?? 'An unexpected error occurred while processing your request. Please try again.',
    contentType: 'text/plain',
    status: 'error',
    metadata: { traceId, degraded: true },
  };
}

export function emergencyResponse(traceId: string, error: string): AxleResponse {
  return {
    responseId: generateId('resp_emergency'),
    content: 'We encountered a problem processing your request. Our team has been notified.',
    contentType: 'text/plain',
    status: 'error',
    metadata: { traceId, emergency: true, error },
  };
}
