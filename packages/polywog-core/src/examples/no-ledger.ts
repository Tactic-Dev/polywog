import {
  createPolywogCore,
  type InterpreterModule,
  type RouterModule,
  type WeaveModule,
  type ExecutorModule,
  type FormatModule,
  type PolywogCoreConfig,
} from '../index.js';

// ── Mock Modules (no LedgerModule provided) ─────────────────────────

const interpreter: InterpreterModule = {
  async interpret(input) {
    return {
      intentId: 'intent-nl01',
      action: 'greet',
      entities: {},
      confidence: 0.99,
    };
  },
};

const router: RouterModule = {
  async plan(input) {
    return {
      routePlanId: 'route-nl01',
      strategy: 'direct',
      spokes: [
        { spokeId: 'spoke-greeter', priority: 1 },
      ],
    };
  },
};

const weave: WeaveModule = {
  async assemble(input) {
    return {
      contextId: 'ctx-nl01',
      entries: [
        { source: 'static', content: 'Welcome message template', relevance: 1.0 },
      ],
    };
  },
};

const executor: ExecutorModule = {
  async execute(input) {
    return {
      executionId: 'exec-nl01',
      status: 'success',
      output: 'Hello! How can I help you today?',
      spokeResults: [
        { spokeId: 'spoke-greeter', status: 'success', durationMs: 5 },
      ],
    };
  },
};

const format: FormatModule = {
  async format(input) {
    return {
      responseId: 'resp-nl01',
      content: String(input.execution.output),
      contentType: 'text/plain',
      status: 'complete',
    };
  },
};

// ── Run ─────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Polywog Core: No Ledger Module ===\n');

  const config: PolywogCoreConfig = {
    modules: {
      interpreter,
      router,
      weave,
      executor,
      format,
      // ledger is intentionally omitted
    },
  };

  const core = createPolywogCore(config);

  const result = await core.run({
    message: 'Hello!',
    metadata: { userId: 'user-anon', source: 'cli-no-ledger' },
  });

  console.log('── Response ──');
  console.log('  Status:', result.response.status);
  console.log('  Content:', result.response.content);

  console.log('\n── Trace ──');
  console.log('  Trace ID:', result.trace.traceId, '← synthetic (no ledger)');
  console.log('  Status:', result.trace.status);

  console.log('\n── Pipeline Status ──');
  console.log('  Interpreter:', result.pipeline.intentStatus);
  console.log('  Router:', result.pipeline.routeStatus);
  console.log('  Weave:', result.pipeline.weaveStatus);
  console.log('  Executor:', result.pipeline.executionStatus);
  console.log('  Format:', result.pipeline.formatStatus);

  console.log('\n── Warnings ──');
  if (result.warnings.length === 0) {
    console.log('  (none — or check if the pipeline emits a ledger warning)');
  } else {
    result.warnings.forEach((w) => console.log(' ', w));
  }

  console.log('\n── Metrics ──');
  console.log('  Total Duration:', result.metrics.totalDurationMs, 'ms');

  console.log('\n=== Done ===');
}

main().catch(console.error);
