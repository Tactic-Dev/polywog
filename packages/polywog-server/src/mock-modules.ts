import type {
  InterpreterModule, InterpreterInput, IntentEnvelope,
  RouterModule, RouterInput, RoutePlan,
  WeaveModule, WeaveInput, ContextBundle,
  ExecutorModule, ExecutorInput, ExecutionResult,
  FormatModule, FormatInput, AxleResponse,
  LedgerModule, LedgerEvent, LedgerTrace,
} from '@polywog/core';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function detectAction(message: string): string {
  const lower = message.toLowerCase();
  if (lower.startsWith('summarize') || lower.includes('summary'))  return 'summarize';
  if (lower.startsWith('analyze') || lower.includes('analysis'))   return 'analyze';
  if (lower.startsWith('compare') || lower.includes('difference')) return 'compare';
  if (lower.startsWith('explain') || lower.includes('how does'))   return 'explain';
  if (lower.startsWith('list') || lower.includes('what are'))      return 'list';
  return 'ask';
}

function generateResponse(action: string, message: string): string {
  const preview = message.length > 80 ? message.slice(0, 80) + '...' : message;

  const templates: Record<string, string> = {
    summarize: `Here is a summary based on your request:\n\n"${preview}"\n\nKey points have been distilled from the input. In a production deployment, the Executor spoke would invoke an LLM to produce a comprehensive summary.`,
    analyze:   `Analysis of your request:\n\n"${preview}"\n\nThe input has been evaluated across multiple dimensions. A production Executor would apply domain-specific analysis models here.`,
    compare:   `Comparison results for your request:\n\n"${preview}"\n\nRelevant items have been compared across key attributes. A production Executor would generate a detailed side-by-side comparison.`,
    explain:   `Explanation:\n\n"${preview}"\n\nThe concept has been broken down into digestible components. A production Executor would provide a thorough, step-by-step explanation.`,
    list:      `Here are the items related to your request:\n\n"${preview}"\n\n1. Item extracted from context\n2. Related item identified\n3. Additional relevant item\n\nA production Executor would generate a comprehensive list from real data sources.`,
    ask:       `Thank you for your message:\n\n"${preview}"\n\nI've processed your request through the Polywog pipeline. In production, the Executor would route this to an appropriate LLM spoke for a detailed response.`,
  };

  return templates[action] ?? templates['ask']!;
}

export const mockInterpreter: InterpreterModule = {
  async interpret(input: InterpreterInput): Promise<IntentEnvelope> {
    const action = detectAction(input.message);
    return {
      intentId: `intent-${uid()}`,
      action,
      entities: { messageLength: input.message.length },
      confidence: 0.85,
      raw: { source: 'mock-interpreter' },
    };
  },
};

export const mockRouter: RouterModule = {
  async plan(input: RouterInput): Promise<RoutePlan> {
    return {
      routePlanId: `route-${uid()}`,
      strategy: 'single-spoke',
      spokes: [{
        spokeId: 'general_llm',
        priority: 1,
        params: { action: input.intent.action },
      }],
    };
  },
};

export const mockWeave: WeaveModule = {
  async assemble(input: WeaveInput): Promise<ContextBundle> {
    const entries = [
      { source: 'session', content: input.message, relevance: 1.0 },
    ];

    if (input.conversationHistory?.length) {
      entries.push({
        source: 'history',
        content: input.conversationHistory.map(h => `${h.role}: ${h.content}`).join('\n'),
        relevance: 0.7,
      });
    }

    return {
      contextId: `ctx-${uid()}`,
      entries,
      sessionSummary: `User request: ${input.intent.action}`,
    };
  },
};

export const mockExecutor: ExecutorModule = {
  async execute(input: ExecutorInput): Promise<ExecutionResult> {
    const spoke = input.route.spokes[0];
    const action = (spoke?.params?.['action'] as string) ?? 'ask';
    const message = input.context.entries.find(e => e.source === 'session')?.content ?? '';

    return {
      executionId: `exec-${uid()}`,
      status: 'success',
      output: generateResponse(action, message),
      spokeResults: [{
        spokeId: spoke?.spokeId ?? 'general_llm',
        status: 'success',
        durationMs: 42,
      }],
    };
  },
};

export const mockFormat: FormatModule = {
  async format(input: FormatInput): Promise<AxleResponse> {
    const content = typeof input.execution.output === 'string'
      ? input.execution.output
      : JSON.stringify(input.execution.output);

    return {
      responseId: `resp-${uid()}`,
      content,
      contentType: 'text/markdown',
      status: input.execution.status === 'success' ? 'complete' : 'partial',
      metadata: {
        action: input.intent.action,
        strategy: input.route.strategy,
      },
    };
  },
};

interface StoredTrace {
  traceId: string;
  status: string;
  events: LedgerEvent[];
  artifacts: Array<{ artifactId: string; type: string; content: unknown }>;
}

const traceStore: StoredTrace[] = [];

export const mockLedger: LedgerModule = {
  async startTrace(metadata?: Record<string, unknown>): Promise<LedgerTrace> {
    const stored: StoredTrace = {
      traceId: `trace-${uid()}`,
      status: 'active',
      events: [],
      artifacts: [],
      ...metadata,
    };
    traceStore.push(stored);
    return { traceId: stored.traceId, status: 'active' };
  },

  async appendEvent(traceId: string, event: LedgerEvent): Promise<void> {
    traceStore.find(t => t.traceId === traceId)?.events.push(event);
  },

  async attachArtifact(traceId: string, artifact: { artifactId: string; type: string; content: unknown }): Promise<void> {
    traceStore.find(t => t.traceId === traceId)?.artifacts.push(artifact);
  },

  async completeTrace(traceId: string): Promise<void> {
    const trace = traceStore.find(t => t.traceId === traceId);
    if (trace) trace.status = 'completed';
  },

  async failTrace(traceId: string, _reason?: string): Promise<void> {
    const trace = traceStore.find(t => t.traceId === traceId);
    if (trace) trace.status = 'failed';
  },
};
