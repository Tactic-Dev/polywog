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
    await delay(15);
    return {
      intentId: 'intent-dbg01',
      action: 'translate',
      entities: { targetLang: 'es', text: input.message },
      confidence: 0.91,
    };
  },
};

const router: RouterModule = {
  async plan(input) {
    await delay(8);
    return {
      routePlanId: 'route-dbg01',
      strategy: 'fan-out',
      spokes: [
        { spokeId: 'spoke-translator', priority: 1, params: { lang: 'es' } },
        { spokeId: 'spoke-validator', priority: 2 },
      ],
    };
  },
};

const weave: WeaveModule = {
  async assemble(input) {
    await delay(12);
    return {
      contextId: 'ctx-dbg01',
      entries: [
        { source: 'glossary', content: 'Domain-specific terms for translation', relevance: 0.85 },
      ],
      constraints: ['formal-tone', 'latin-american-spanish'],
    };
  },
};

const executor: ExecutorModule = {
  async execute(input) {
    await delay(25);
    return {
      executionId: 'exec-dbg01',
      status: 'success',
      output: '¡Hola! Bienvenido al panel de control.',
      spokeResults: [
        { spokeId: 'spoke-translator', status: 'success', output: 'Translated OK', durationMs: 20 },
        { spokeId: 'spoke-validator', status: 'success', output: 'Grammar check passed', durationMs: 5 },
      ],
    };
  },
};

const format: FormatModule = {
  async format(input) {
    await delay(4);
    return {
      responseId: 'resp-dbg01',
      content: String(input.execution.output),
      contentType: 'text/plain',
      status: 'complete',
      metadata: { sourceLang: 'en', targetLang: 'es' },
    };
  },
};

const ledger: LedgerModule = {
  async startTrace() {
    return { traceId: 'ledger-dbg-001', status: 'active' } satisfies LedgerTrace;
  },
  async appendEvent() {},
  async attachArtifact() {},
  async completeTrace() {},
  async failTrace() {},
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Run ─────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Polywog Core: Debug Mode ===\n');

  const config: PolywogCoreConfig = {
    modules: { interpreter, router, weave, executor, format, ledger },
    defaults: { debug: true },
  };

  const core = createPolywogCore(config);

  const result = await core.run({
    message: 'Hello! Welcome to the dashboard.',
    debug: true,
    metadata: { userId: 'dev-01', source: 'cli-debug' },
    preferences: { formatProfile: 'chat' },
  });

  console.log('── Response ──');
  console.log('  Status:', result.response.status);
  console.log('  Content:', result.response.content);

  console.log('\n── Trace ──');
  console.log('  Trace ID:', result.trace.traceId);
  console.log('  Status:', result.trace.status);

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

  console.log('\n── Debug Info ──');
  if (result.debug) {
    if (result.debug.stageOutputs) {
      console.log('  Stage Outputs:');
      for (const [stage, output] of Object.entries(result.debug.stageOutputs)) {
        console.log(`    ${stage}:`, JSON.stringify(output, null, 2).split('\n').join('\n      '));
      }
    }

    if (result.debug.stageDurations) {
      console.log('  Stage Durations:');
      for (const [stage, ms] of Object.entries(result.debug.stageDurations)) {
        console.log(`    ${stage}: ${ms} ms`);
      }
    }

    if (result.debug.fallbackNotes && result.debug.fallbackNotes.length > 0) {
      console.log('  Fallback Notes:');
      result.debug.fallbackNotes.forEach((note) => console.log(`    - ${note}`));
    } else {
      console.log('  Fallback Notes: (none)');
    }
  } else {
    console.log('  (debug info not present — ensure debug: true is set)');
  }

  if (result.warnings.length > 0) {
    console.log('\n── Warnings ──');
    result.warnings.forEach((w) => console.log(' ', w));
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
