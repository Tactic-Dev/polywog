/**
 * Domain types used across module boundaries.
 * Defined locally to avoid compile-time coupling to sibling packages.
 */

export interface IntentEnvelope {
  intentId: string;
  action: string;
  entities: Record<string, unknown>;
  confidence: number;
  raw?: unknown;
}

export interface RoutePlan {
  routePlanId: string;
  strategy: string;
  spokes: SpokeAssignment[];
  clarificationNeeded?: boolean;
  clarificationPrompt?: string;
  raw?: unknown;
}

export interface SpokeAssignment {
  spokeId: string;
  priority: number;
  params?: Record<string, unknown>;
}

export interface ContextBundle {
  contextId: string;
  entries: ContextEntry[];
  constraints?: string[];
  sessionSummary?: string;
  raw?: unknown;
}

export interface ContextEntry {
  source: string;
  content: string;
  relevance: number;
  metadata?: Record<string, unknown>;
}

export interface ExecutionResult {
  executionId: string;
  status: 'success' | 'partial' | 'failed';
  output: unknown;
  spokeResults?: SpokeResult[];
  warnings?: string[];
  errors?: string[];
  raw?: unknown;
}

export interface SpokeResult {
  spokeId: string;
  status: 'success' | 'failed' | 'skipped';
  output?: unknown;
  durationMs?: number;
  error?: string;
}

export interface AxleResponse {
  responseId: string;
  content: string;
  contentType: string;
  status: 'complete' | 'partial' | 'clarification_needed' | 'error';
  artifacts?: ResponseArtifact[];
  metadata?: Record<string, unknown>;
}

export interface ResponseArtifact {
  artifactId: string;
  type: string;
  label?: string;
  content: unknown;
}

export interface ExecutorHooks {
  onStepStarted?: (stepId: string, spokeId: string) => void;
  onStepCompleted?: (stepId: string, spokeId: string, result: unknown) => void;
  onStepFailed?: (stepId: string, spokeId: string, error: unknown) => void;
  onFallbackApplied?: (stepId: string, spokeId: string, fallbackSpokeId: string) => void;
  onExecutionNote?: (note: string) => void;
}

export interface LedgerEvent {
  eventType: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface LedgerTrace {
  traceId: string;
  status: 'active' | 'completed' | 'failed';
}

/* ── Module contracts ─────────────────────────────────────────────── */

export interface InterpreterModule {
  interpret(input: InterpreterInput): Promise<IntentEnvelope>;
}

export interface InterpreterInput {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  attachments?: Array<{ filename: string; mimeType: string; size: number; tags?: string[] }>;
  systemContext?: { activeProject?: string; mode?: string; constraints?: string[] };
}

export interface RouterModule {
  plan(input: RouterInput): Promise<RoutePlan>;
}

export interface RouterInput {
  intent: IntentEnvelope;
  preferences?: {
    internalFirst?: boolean;
    preferSpeed?: boolean;
    preferAccuracy?: boolean;
    preferLowCost?: boolean;
    allowParallel?: boolean;
  };
  availableSpokes?: string[];
  disabledSpokes?: string[];
  offlineMode?: boolean;
}

export interface WeaveModule {
  assemble(input: WeaveInput): Promise<ContextBundle>;
}

export interface WeaveInput {
  intent: IntentEnvelope;
  route: RoutePlan;
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  systemContext?: { activeProject?: string; mode?: string; constraints?: string[] };
}

export interface ExecutorModule {
  execute(input: ExecutorInput): Promise<ExecutionResult>;
}

export interface ExecutorInput {
  route: RoutePlan;
  context: ContextBundle;
  hooks?: ExecutorHooks;
}

export interface FormatModule {
  format(input: FormatInput): Promise<AxleResponse>;
}

export interface FormatInput {
  traceId: string;
  intent: IntentEnvelope;
  route: RoutePlan;
  execution: ExecutionResult;
  formatProfile?: 'chat' | 'api' | 'dashboard' | 'compact';
}

export interface LedgerModule {
  startTrace(metadata?: Record<string, unknown>): Promise<LedgerTrace>;
  appendEvent(traceId: string, event: LedgerEvent): Promise<void>;
  attachArtifact(traceId: string, artifact: { artifactId: string; type: string; content: unknown }): Promise<void>;
  completeTrace(traceId: string): Promise<void>;
  failTrace(traceId: string, reason?: string): Promise<void>;
}
