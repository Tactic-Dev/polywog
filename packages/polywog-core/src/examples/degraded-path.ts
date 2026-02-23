import {
  createPolywogCore,
  type InterpreterModule,
  type RouterModule,
  type WeaveModule,
  type ExecutorModule,
  type FormatModule,
  type LedgerModule,
  type LedgerTrace,
  type PolywogCoreConfig,
} from '../index.js';

// ── Mock Modules ────────────────────────────────────────────────────

const interpreter: InterpreterModule = {
  async interpret(input) {
    return {
      intentId: 'intent-d01',
      action: 'search',
      entities: { query: input.message },
      confidence: 0.88,
    };
  },
};

/**
 * Router that throws to simulate a routing failure.
 * The pipeline should fall back to a default route and continue.
 */
const failingRouter: RouterModule = {
  async plan(_input) {
    throw new Error('Router unavailable: spoke registry connection timed out');
  },
};

/**
 * Weave module that throws to simulate context assembly failure.
 * The pipeline should fall back to an empty context bundle.
 */
const failingWeave: WeaveModule = {
  async assemble(_input) {
    throw new Error('Weave failure: vector store is unreachable');
  },
};

const executor: ExecutorModule = {
  async execute(input) {
    return {
      executionId: 'exec-d01',
      status: 'partial',
      output: 'Partial results — some context was unavailable.',
      spokeResults: [
        { spokeId: 'spoke-search', status: 'success', output: 'Found 3 results', durationMs: 200 },
      ],
      warnings: ['Context bundle was empty; results may lack relevance.'],
    };
  },
};

const format: FormatModule = {
  async format(input) {
    const status = input.execution.status === 'success' ? 'complete' : 'partial';
    return {
      responseId: 'resp-d01',
      content: `Results (${status}): ${input.execution.output}`,
      contentType: 'text/plain',
      status,
    };
  },
};

const ledger: LedgerModule = {
  async startTrace(metadata) {
    return { traceId: 'ledger-degraded-001', status: 'active' } satisfies LedgerTrace;
  },
  async appendEvent() {},
  async attachArtifact() {},
  async completeTrace() {},
  async failTrace() {},
};

// ── Run ─────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Polywog Core: Degraded Path ===\n');

  const config: PolywogCoreConfig = {
    modules: {
      interpreter,
      router: failingRouter,
      weave: failingWeave,
      executor,
      format,
      ledger,
    },
    logger: {
      debug: (msg, data) => console.log(`  [DEBUG] ${msg}`, data ?? ''),
      info:  (msg, data) => console.log(`  [INFO]  ${msg}`, data ?? ''),
      warn:  (msg, data) => console.warn(`  [WARN]  ${msg}`, data ?? ''),
      error: (msg, data) => console.error(`  [ERROR] ${msg}`, data ?? ''),
    },
  };

  const core = createPolywogCore(config);

  const result = await core.run({
    message: 'Search for deployment runbooks',
    metadata: { userId: 'user-99', source: 'cli-degraded-test' },
  });

  console.log('\n── Response ──');
  console.log('  Status:', result.response.status);
  console.log('  Content:', result.response.content);

  console.log('\n── Pipeline Status ──');
  console.log('  Interpreter:', result.pipeline.intentStatus);
  console.log('  Router:', result.pipeline.routeStatus, '← expected degraded/failed');
  console.log('  Weave:', result.pipeline.weaveStatus, '← expected degraded/failed');
  console.log('  Executor:', result.pipeline.executionStatus);
  console.log('  Format:', result.pipeline.formatStatus);

  console.log('\n── Warnings ──');
  if (result.warnings.length === 0) {
    console.log('  (none)');
  } else {
    result.warnings.forEach((w) => console.log(' ', w));
  }

  console.log('\n── Errors ──');
  if (result.errors.length === 0) {
    console.log('  (none)');
  } else {
    result.errors.forEach((e) => console.log(' ', e));
  }

  console.log('\n── Trace ──');
  console.log('  Trace ID:', result.trace.traceId);
  console.log('  Status:', result.trace.status);

  console.log('\n── Metrics ──');
  console.log('  Total Duration:', result.metrics.totalDurationMs, 'ms');

  console.log('\n=== Done ===');
}

main().catch(console.error);
