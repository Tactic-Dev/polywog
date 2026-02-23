import type {
  InterpreterModule,
  RouterModule,
  WeaveModule,
  ExecutorModule,
  FormatModule,
  LedgerModule,
  IntentEnvelope,
  RoutePlan,
  ContextBundle,
  ExecutionResult,
  AxleResponse,
  LedgerTrace,
  LedgerEvent,
} from '../types/modules.js';
import type { PolywogRunInput } from '../types/run-input.js';

export interface MockModules {
  interpreter: InterpreterModule & { calls: unknown[] };
  router: RouterModule & { calls: unknown[] };
  weave: WeaveModule & { calls: unknown[] };
  executor: ExecutorModule & { calls: unknown[] };
  format: FormatModule & { calls: unknown[] };
}

export interface MockLedger extends LedgerModule {
  startTraceCalls: unknown[];
  appendEventCalls: Array<{ traceId: string; event: LedgerEvent }>;
  attachArtifactCalls: Array<{ traceId: string; artifact: unknown }>;
  completeTraceCalls: string[];
  failTraceCalls: Array<{ traceId: string; reason?: string }>;
}

export const MOCK_INTENT: IntentEnvelope = {
  intentId: 'intent-001',
  action: 'summarize',
  entities: { topic: 'testing' },
  confidence: 0.95,
};

export const MOCK_ROUTE: RoutePlan = {
  routePlanId: 'route-001',
  strategy: 'single_spoke',
  spokes: [{ spokeId: 'summarizer', priority: 1 }],
};

export const MOCK_CONTEXT: ContextBundle = {
  contextId: 'ctx-001',
  entries: [
    { source: 'memory', content: 'Prior conversation about testing', relevance: 0.9 },
  ],
  constraints: [],
  sessionSummary: 'User is asking about tests',
};

export const MOCK_EXECUTION: ExecutionResult = {
  executionId: 'exec-001',
  status: 'success',
  output: { summary: 'Here is the summary.' },
  spokeResults: [{ spokeId: 'summarizer', status: 'success', output: 'done', durationMs: 42 }],
};

export const MOCK_RESPONSE: AxleResponse = {
  responseId: 'resp-001',
  content: 'Here is your summary of the topic.',
  contentType: 'text/markdown',
  status: 'complete',
};

export function createMockModules(): MockModules {
  const interpreterCalls: unknown[] = [];
  const routerCalls: unknown[] = [];
  const weaveCalls: unknown[] = [];
  const executorCalls: unknown[] = [];
  const formatCalls: unknown[] = [];

  return {
    interpreter: {
      calls: interpreterCalls,
      async interpret(input) {
        interpreterCalls.push(input);
        return { ...MOCK_INTENT };
      },
    },
    router: {
      calls: routerCalls,
      async plan(input) {
        routerCalls.push(input);
        return { ...MOCK_ROUTE };
      },
    },
    weave: {
      calls: weaveCalls,
      async assemble(input) {
        weaveCalls.push(input);
        return { ...MOCK_CONTEXT, entries: [...MOCK_CONTEXT.entries] };
      },
    },
    executor: {
      calls: executorCalls,
      async execute(input) {
        executorCalls.push(input);
        return { ...MOCK_EXECUTION, spokeResults: [...(MOCK_EXECUTION.spokeResults ?? [])] };
      },
    },
    format: {
      calls: formatCalls,
      async format(input) {
        formatCalls.push(input);
        return { ...MOCK_RESPONSE };
      },
    },
  };
}

export function createMockLedger(): MockLedger {
  const startTraceCalls: unknown[] = [];
  const appendEventCalls: Array<{ traceId: string; event: LedgerEvent }> = [];
  const attachArtifactCalls: Array<{ traceId: string; artifact: unknown }> = [];
  const completeTraceCalls: string[] = [];
  const failTraceCalls: Array<{ traceId: string; reason?: string }> = [];

  return {
    startTraceCalls,
    appendEventCalls,
    attachArtifactCalls,
    completeTraceCalls,
    failTraceCalls,

    async startTrace(metadata) {
      startTraceCalls.push(metadata);
      return { traceId: 'trace-mock-001', status: 'active' } satisfies LedgerTrace;
    },
    async appendEvent(traceId, event) {
      appendEventCalls.push({ traceId, event });
    },
    async attachArtifact(traceId, artifact) {
      attachArtifactCalls.push({ traceId, artifact });
    },
    async completeTrace(traceId) {
      completeTraceCalls.push(traceId);
    },
    async failTrace(traceId, reason) {
      failTraceCalls.push({ traceId, reason });
    },
  };
}

export function validInput(overrides?: Partial<PolywogRunInput>): PolywogRunInput {
  return {
    message: 'Summarize the latest test results',
    ...overrides,
  };
}
