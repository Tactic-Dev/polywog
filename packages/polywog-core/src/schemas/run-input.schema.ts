import { z } from 'zod';

const attachmentSummarySchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  tags: z.array(z.string()).optional(),
});

const requestMetadataSchema = z.object({
  userId: z.string().optional(),
  workspaceId: z.string().optional(),
  source: z.string().optional(),
  timestamp: z.string().optional(),
  requestId: z.string().optional(),
});

const systemContextSchema = z.object({
  activeProject: z.string().optional(),
  mode: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  featureFlags: z.record(z.string(), z.boolean()).optional(),
});

const formatProfileSchema = z.enum(['chat', 'api', 'dashboard', 'compact']);

const preferencesSchema = z.object({
  internalFirst: z.boolean().optional(),
  preferSpeed: z.boolean().optional(),
  preferAccuracy: z.boolean().optional(),
  preferLowCost: z.boolean().optional(),
  allowParallel: z.boolean().optional(),
  formatProfile: formatProfileSchema.optional(),
  includeDebug: z.boolean().optional(),
});

const runtimeOverridesSchema = z.object({
  availableSpokes: z.array(z.string()).optional(),
  disabledSpokes: z.array(z.string()).optional(),
  offlineMode: z.boolean().optional(),
  mockData: z.record(z.string(), z.unknown()).optional(),
});

const conversationEntrySchema = z.object({
  role: z.string().min(1),
  content: z.string(),
});

export const polywogRunInputSchema = z.object({
  message: z.string().min(1, 'message is required and must be non-empty'),
  conversationHistory: z.array(conversationEntrySchema).optional(),
  metadata: requestMetadataSchema.optional(),
  attachments: z.array(attachmentSummarySchema).optional(),
  systemContext: systemContextSchema.optional(),
  preferences: preferencesSchema.optional(),
  runtimeOverrides: runtimeOverridesSchema.optional(),
  debug: z.boolean().optional(),
});

export type ValidatedRunInput = z.infer<typeof polywogRunInputSchema>;
