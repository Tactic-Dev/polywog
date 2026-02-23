import {
  createPolywogCore,
  type InterpreterModule,
  type RouterModule,
  type WeaveModule,
  type ExecutorModule,
  type FormatModule,
  type LedgerModule,
  type LedgerEvent,
  type LedgerTrace,
  type PolywogCoreConfig,
} from '../index.js';

// ── Mock Modules ────────────────────────────────────────────────────

const interpreter: InterpreterModule = {
  async interpret(input) {
    return {
      intentId: 'intent-001',
      action: 'summarize',
      entities: { topic: 'quarterly earnings' },
      confidence: 0.95,
      raw: { originalMessage: input.message },
    };
  },
};

const router: RouterModule = {
  async plan(input) {
    return {
      routePlanId: 'route-001',
      strategy: 'single-spoke',
      spokes: [
        { spokeId: 'spoke-summarizer', priority: 1, params: { maxLength: 500 } },
      ],
    };
  },
};

const weave: WeaveModule = {
  async assemble(input) {
    return {
      contextId: 'ctx-001',
      entries: [
        {
          source: 'knowledge-base',
          content: 'Q3 revenue was $12M, up 15% YoY.',
          relevance: 0.92,
        },
        {
          source: 'user-history',
          content: 'User previously asked about Q2 results.',
          relevance: 0.7,
        },
      ],
      sessionSummary: 'Ongoing finance analysis session',
    };
  },
};

const executor: ExecutorModule = {
  async execute(input) {
    return {
      executionId: 'exec-001',
      status: 'success',
      output: 'Q3 earnings summary: Revenue reached $12M, a 15% increase year-over-year.',
      spokeResults: [
        { spokeId: 'spoke-summarizer', status: 'success', output: 'Summary generated', durationMs: 120 },
      ],
    };
  },
};

const format: FormatModule = {
  async format(input) {
    return {
      responseId: 'resp-001',
      content: `Here is your summary:\n\n${input.execution.output}`,
      contentType: 'text/markdown',
      status: 'complete',
      metadata: { wordCount: 14 },
    };
  },
};

const ledger: LedgerModule = {
  traces: new Map<string, LedgerTrace>(),
  events: new Map<string, LedgerEvent[]>(),

  async startTrace(metadata) {
    const trace: LedgerTrace = { traceId: 'ledger-trace-001', status: 'active' };
    this.traces.set(trace.traceId, trace);
    this.events.set(trace.traceId, []);
    console.log('  [Ledger] Trace started:', trace.traceId);
    return trace;
  },

  async appendEvent(traceId, event) {
    this.events.get(traceId)?.push(event);
    console.log(`  [Ledger] Event appended to ${traceId}: ${event.eventType}`);
  },

  async attachArtifact(traceId, artifact) {
    console.log(`  [Ledger] Artifact attached to ${traceId}: ${artifact.artifactId}`);
  },

  async completeTrace(traceId) {
    const trace = this.traces.get(traceId);
    if (trace) trace.status = 'completed';
    console.log(`  [Ledger] Trace completed: ${traceId}`);
  },

  async failTrace(traceId, reason) {
    const trace = this.traces.get(traceId);
    if (trace) trace.status = 'failed';
    console.log(`  [Ledger] Trace failed: ${traceId} — ${reason}`);
  },
} as LedgerModule & { traces: Map<string, LedgerTrace>; events: Map<string, LedgerEvent[]> };

// ── Run ─────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Polywog Core: Happy Path ===\n');

  const config: PolywogCoreConfig = {
    modules: { interpreter, router, weave, executor, format, ledger },
  };

  const core = createPolywogCore(config);

  const result = await core.run({
    message: 'Summarize the quarterly earnings report',
    metadata: {
      userId: 'user-42',
      workspaceId: 'ws-finance',
      source: 'cli-example',
      requestId: 'req-001',
    },
    systemContext: {
      activeProject: 'finance-dashboard',
      mode: 'analysis',
    },
    preferences: {
      preferAccuracy: true,
      formatProfile: 'chat',
    },
  });

  console.log('\n── Response ──');
  console.log('  Status:', result.response.status);
  console.log('  Content:', result.response.content);

  console.log('\n── Trace ──');
  console.log('  Trace ID:', result.trace.traceId);
  console.log('  Trace Status:', result.trace.status);
  console.log('  Intent ID:', result.trace.intentId);
  console.log('  Route Plan ID:', result.trace.routePlanId);
  console.log('  Execution ID:', result.trace.executionId);

  console.log('\n── Pipeline Status ──');
  console.log('  Interpreter:', result.pipeline.intentStatus);
  console.log('  Router:', result.pipeline.routeStatus);
  console.log('  Weave:', result.pipeline.weaveStatus);
  console.log('  Executor:', result.pipeline.executionStatus);
  console.log('  Format:', result.pipeline.formatStatus);

  console.log('\n── Metrics ──');
  console.log('  Total Duration:', result.metrics.totalDurationMs, 'ms');
  console.log('  Interpreter:', result.metrics.interpreterMs, 'ms');
  console.log('  Router:', result.metrics.routerMs, 'ms');
  console.log('  Weave:', result.metrics.weaveMs, 'ms');
  console.log('  Executor:', result.metrics.executorMs, 'ms');
  console.log('  Format:', result.metrics.formatMs, 'ms');

  if (result.warnings.length) {
    console.log('\n── Warnings ──');
    result.warnings.forEach((w) => console.log(' ', w));
  }

  if (result.errors.length) {
    console.log('\n── Errors ──');
    result.errors.forEach((e) => console.log(' ', e));
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
