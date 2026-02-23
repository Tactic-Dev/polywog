import { z } from 'zod';

const stageStatusSchema = z.enum(['success', 'degraded', 'failed', 'skipped']);

const responseArtifactSchema = z.object({
  artifactId: z.string(),
  type: z.string(),
  label: z.string().optional(),
  content: z.unknown(),
});

const axleResponseSchema = z.object({
  responseId: z.string(),
  content: z.string(),
  contentType: z.string(),
  status: z.enum(['complete', 'partial', 'clarification_needed', 'error']),
  artifacts: z.array(responseArtifactSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const traceInfoSchema = z.object({
  traceId: z.string(),
  status: z.enum(['active', 'completed', 'failed']),
  intentId: z.string().optional(),
  routePlanId: z.string().optional(),
  executionId: z.string().optional(),
});

const pipelineStatusSchema = z.object({
  intentStatus: stageStatusSchema,
  routeStatus: stageStatusSchema,
  weaveStatus: stageStatusSchema,
  executionStatus: stageStatusSchema,
  formatStatus: stageStatusSchema,
});

const pipelineMetricsSchema = z.object({
  totalDurationMs: z.number().nonnegative(),
  interpreterMs: z.number().nonnegative(),
  routerMs: z.number().nonnegative(),
  weaveMs: z.number().nonnegative(),
  executorMs: z.number().nonnegative(),
  formatMs: z.number().nonnegative(),
});

const debugInfoSchema = z.object({
  stageOutputs: z.record(z.string(), z.unknown()).optional(),
  stageDurations: z.record(z.string(), z.number()).optional(),
  fallbackNotes: z.array(z.string()).optional(),
});

export const polywogRunResultSchema = z.object({
  response: axleResponseSchema,
  trace: traceInfoSchema,
  pipeline: pipelineStatusSchema,
  metrics: pipelineMetricsSchema,
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
  debug: debugInfoSchema.optional(),
});

export type ValidatedRunResult = z.infer<typeof polywogRunResultSchema>;
