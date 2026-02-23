import { describe, it, expect } from 'vitest';
import { InterpreterAdapter } from '../adapters/interpreter.js';
import { RouterAdapter } from '../adapters/router.js';
import { WeaveAdapter } from '../adapters/weave.js';
import { ExecutorAdapter } from '../adapters/executor.js';
import { FormatAdapter } from '../adapters/format.js';
import { LedgerAdapter } from '../adapters/ledger.js';
import type { InterpreterInput, RouterInput, WeaveInput, ExecutorInput, FormatInput } from '@polywog/core';

function fakeInterpreter() {
  return {
    interpret(input: Record<string, unknown>) {
      return {
        id: 'intent_001',
        timestamp: new Date().toISOString(),
        rawText: input.message as string,
        normalizedText: (input.message as string).toLowerCase(),
        intentType: 'ask',
        domain: 'general',
        subTasks: [],
        entities: [{ type: 'tool', value: 'docker', raw: 'docker' }],
        constraints: [{ type: 'format', value: 'markdown', raw: 'in markdown' }],
        urgency: 'medium',
        confidence: 0.85,
        requiresTools: false,
        suggestedTools: [],
        outputFormat: 'text',
        citationRequired: false,
        safetyFlags: [],
        routingHints: [],
        clarificationNeeded: false,
        clarificationQuestions: [],
      };
    },
  };
}

function fakeRouter() {
  return {
    route(input: Record<string, unknown>) {
      const ie = input.intentEnvelope as Record<string, unknown>;
      return {
        id: 'route_001',
        timestamp: new Date().toISOString(),
        intentId: ie.id as string,
        status: 'ready',
        primaryRoute: { id: 'pr_1', selectedSpokes: ['general_llm'], executionMode: 'single', steps: [], confidence: 0.9, riskLevel: 'low', reasoning: 'default' },
        secondaryRoutes: [],
        selectedSpokes: ['general_llm'],
        executionMode: 'single',
        steps: [{ stepId: 'step_1', spokeId: 'general_llm', action: 'answer', purpose: 'respond to question', inputFrom: 'intent', dependsOn: [], optionality: 'required', timeoutMs: 30000, expectedOutput: 'text' }],
        preconditions: [],
        constraintsApplied: [],
        citationRequired: false,
        clarificationRequired: false,
        clarificationQuestions: [],
        fallbackPlan: [],
        riskLevel: 'low',
        confidence: 0.9,
        reasoning: 'Simple ask → general_llm',
      };
    },
  };
}

function fakeWeave() {
  return async (input: Record<string, unknown>) => ({
    id: 'ctx_001',
    timestamp: new Date().toISOString(),
    traceId: (input.traceId as string) ?? 'test_trace',
    intentId: 'intent_001',
    status: 'ready',
    summary: { shortText: 'basic context assembled', coverage: 'medium', notes: [] },
    contextItems: [
      { contextItemId: 'ci_1', category: 'session', sourceType: 'conversation', content: 'user asked a question', contentType: 'text', relevanceScore: 0.8, trustScore: 0.9, tags: [], hash: 'abc', rank: 1 },
    ],
    sourceMap: [{ sourceType: 'conversation', count: 1 }],
    constraintsApplied: ['format:markdown'],
    warnings: [],
    metrics: { totalItems: 1, dedupedItems: 0, sourceCount: 1, assemblyDurationMs: 5 },
    confidence: 0.8,
  });
}

function fakeExecutor() {
  return async (input: Record<string, unknown>) => {
    const rp = input.routePlan as Record<string, unknown>;
    return {
      id: 'exec_001',
      timestamp: new Date().toISOString(),
      traceId: input.traceId as string,
      routePlanId: rp.id as string,
      status: 'success',
      stepResults: [
        { stepId: 'step_1', spokeId: 'general_llm', status: 'success', required: true, startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), durationMs: 42, action: 'answer', purpose: 'respond', outputText: 'Docker is a container platform.' },
      ],
      spokesUsed: ['general_llm'],
      completedStepIds: ['step_1'],
      failedStepIds: [],
      skippedStepIds: [],
      fallbacksApplied: [],
      actionsTaken: ['Answered question'],
      nextSteps: [],
      warnings: [],
      errors: [],
      metrics: { totalSteps: 1, completedSteps: 1, failedSteps: 0, skippedSteps: 0, durationMs: 42, parallelGroupsExecuted: 0 },
      confidence: 0.9,
    };
  };
}

function fakeFormatter() {
  return {
    format(input: Record<string, unknown>) {
      const exec = input.executionResult as { stepResults: Array<{ outputText?: string }> };
      const text = exec.stepResults.map((s) => s.outputText ?? '').join('\n');
      return {
        id: 'resp_001',
        timestamp: new Date().toISOString(),
        traceId: input.traceId as string,
        status: 'done',
        title: 'Answer',
        answer: { text, markdown: `**${text}**` },
        evidence: { citations: [], sources: [] },
        actionsTaken: ['Answered'],
        nextSteps: [],
        artifacts: [],
        clarifications: [],
        executionSummary: { spokesUsed: ['general_llm'], stepCount: 1, completedSteps: 1, failedSteps: 0, degraded: false, fallbacksApplied: [] },
        uiHints: { renderMode: 'chat', showCitations: false, showArtifacts: false, showActions: false },
      };
    },
  };
}

function fakeLedger() {
  const events: unknown[] = [];
  return {
    ledger: {
      async startTrace(input: unknown) {
        return { traceId: 'trc_test_001', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: 'started', request: { rawText: '' }, links: {}, summary: { title: '' }, metrics: { stepCount: 0, eventCount: 0, artifactCount: 0 }, tags: [] };
      },
      async appendEvent(input: unknown) { events.push(input); return { eventId: 'evt_1', traceId: '', timestamp: '', stage: '', type: '', status: '', message: '' }; },
      async attachArtifact(input: unknown) { events.push(input); return { artifactId: 'art_1', traceId: '', createdAt: '', type: '', title: '' }; },
      async completeTrace(input: unknown) { events.push(input); return { traceId: '', createdAt: '', updatedAt: '', status: 'complete', request: { rawText: '' }, links: {}, summary: { title: '' }, metrics: { stepCount: 0, eventCount: 0, artifactCount: 0 }, tags: [] }; },
      async failTrace(input: unknown) { events.push(input); return { traceId: '', createdAt: '', updatedAt: '', status: 'failed', request: { rawText: '' }, links: {}, summary: { title: '' }, metrics: { stepCount: 0, eventCount: 0, artifactCount: 0 }, tags: [] }; },
    },
    events,
  };
}

/* ── Interpreter Adapter ────────────────────────────────────────── */

describe('InterpreterAdapter', () => {
  it('maps Core InterpreterInput to package input and returns Core IntentEnvelope', async () => {
    const adapter = new InterpreterAdapter(fakeInterpreter());
    const input: InterpreterInput = {
      message: 'How do I run Docker?',
      conversationHistory: [{ role: 'user', content: 'hello' }],
    };
    const result = await adapter.interpret(input);

    expect(result.intentId).toBe('intent_001');
    expect(result.action).toBe('ask');
    expect(result.confidence).toBe(0.85);
    expect(result.entities).toHaveProperty('tool', 'docker');
    expect(result.raw).toBeDefined();
  });

  it('stores original package output in raw', async () => {
    const adapter = new InterpreterAdapter(fakeInterpreter());
    const result = await adapter.interpret({ message: 'test' });

    const raw = result.raw as Record<string, unknown>;
    expect(raw.intentType).toBe('ask');
    expect(raw.domain).toBe('general');
    expect(raw.rawText).toBe('test');
  });
});

/* ── Router Adapter ─────────────────────────────────────────────── */

describe('RouterAdapter', () => {
  it('maps Core RouterInput to package input and returns Core RoutePlan', async () => {
    const interp = new InterpreterAdapter(fakeInterpreter());
    const intent = await interp.interpret({ message: 'How do I deploy?' });

    const adapter = new RouterAdapter(fakeRouter());
    const input: RouterInput = {
      intent,
      preferences: { preferSpeed: true, internalFirst: false },
    };
    const result = await adapter.plan(input);

    expect(result.routePlanId).toBe('route_001');
    expect(result.strategy).toBe('single');
    expect(result.spokes).toHaveLength(1);
    expect(result.spokes[0]!.spokeId).toBe('general_llm');
    expect(result.clarificationNeeded).toBe(false);
    expect(result.raw).toBeDefined();
  });
});

/* ── Weave Adapter ──────────────────────────────────────────────── */

describe('WeaveAdapter', () => {
  it('maps Core WeaveInput to package input and returns Core ContextBundle', async () => {
    const interp = new InterpreterAdapter(fakeInterpreter());
    const intent = await interp.interpret({ message: 'test query' });

    const router = new RouterAdapter(fakeRouter());
    const route = await router.plan({ intent });

    const adapter = new WeaveAdapter(fakeWeave());
    adapter.setTraceId('trc_test');
    const input: WeaveInput = { intent, route, message: 'test query' };
    const result = await adapter.assemble(input);

    expect(result.contextId).toBe('ctx_001');
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]!.source).toBe('conversation');
    expect(result.constraints).toContain('format:markdown');
    expect(result.raw).toBeDefined();
  });
});

/* ── Executor Adapter ───────────────────────────────────────────── */

describe('ExecutorAdapter', () => {
  it('maps Core ExecutorInput to package input and returns Core ExecutionResult', async () => {
    const interp = new InterpreterAdapter(fakeInterpreter());
    const intent = await interp.interpret({ message: 'test' });
    const router = new RouterAdapter(fakeRouter());
    const route = await router.plan({ intent });
    const weaveAd = new WeaveAdapter(fakeWeave());
    weaveAd.setTraceId('trc_test');
    const context = await weaveAd.assemble({ intent, route, message: 'test' });

    const adapter = new ExecutorAdapter(fakeExecutor());
    adapter.setTraceId('trc_test');
    const input: ExecutorInput = { route, context };
    const result = await adapter.execute(input);

    expect(result.executionId).toBe('exec_001');
    expect(result.status).toBe('success');
    expect(result.spokeResults).toHaveLength(1);
    expect(result.spokeResults![0]!.spokeId).toBe('general_llm');
    expect(result.raw).toBeDefined();
  });
});

/* ── Format Adapter ─────────────────────────────────────────────── */

describe('FormatAdapter', () => {
  it('maps Core FormatInput to package input and returns Core AxleResponse', async () => {
    const interp = new InterpreterAdapter(fakeInterpreter());
    const intent = await interp.interpret({ message: 'test' });
    const router = new RouterAdapter(fakeRouter());
    const route = await router.plan({ intent });
    const weaveAd = new WeaveAdapter(fakeWeave());
    weaveAd.setTraceId('trc_test');
    const context = await weaveAd.assemble({ intent, route, message: 'test' });
    const execAd = new ExecutorAdapter(fakeExecutor());
    execAd.setTraceId('trc_test');
    const execution = await execAd.execute({ route, context });

    const adapter = new FormatAdapter(fakeFormatter());
    const input: FormatInput = { traceId: 'trc_test', intent, route, execution, formatProfile: 'chat' };
    const result = await adapter.format(input);

    expect(result.responseId).toBe('resp_001');
    expect(result.status).toBe('complete');
    expect(result.content).toContain('Docker is a container platform.');
    expect(result.contentType).toBe('text/markdown');
  });
});

/* ── Ledger Adapter ─────────────────────────────────────────────── */

describe('LedgerAdapter', () => {
  it('maps Core startTrace to package startTrace input', async () => {
    const { ledger } = fakeLedger();
    const adapter = new LedgerAdapter(ledger);
    adapter.setRawText('Hello world');
    const trace = await adapter.startTrace({ userId: 'u1', workspaceId: 'ws1' });

    expect(trace.traceId).toBe('trc_test_001');
    expect(trace.status).toBe('active');
  });

  it('maps Core appendEvent to package appendEvent input', async () => {
    const { ledger, events } = fakeLedger();
    const adapter = new LedgerAdapter(ledger);
    await adapter.appendEvent('trc_test_001', { eventType: 'intent_interpreted', timestamp: new Date().toISOString(), data: { intentId: 'i1' } });

    const appended = events[0] as Record<string, unknown>;
    expect(appended.traceId).toBe('trc_test_001');
    expect(appended.type).toBe('intent_interpreted');
    expect(appended.stage).toBe('interpreter');
    expect(appended.status).toBe('success');
  });

  it('maps Core completeTrace to package completeTrace input', async () => {
    const { ledger, events } = fakeLedger();
    const adapter = new LedgerAdapter(ledger);
    await adapter.completeTrace('trc_test_001');

    const completed = events[0] as Record<string, unknown>;
    expect(completed).toEqual({ traceId: 'trc_test_001' });
  });

  it('maps Core failTrace to package failTrace input', async () => {
    const { ledger, events } = fakeLedger();
    const adapter = new LedgerAdapter(ledger);
    await adapter.failTrace('trc_test_001', 'something went wrong');

    const failed = events[0] as Record<string, unknown>;
    expect(failed).toEqual({
      traceId: 'trc_test_001',
      error: { code: 'PIPELINE_FAILURE', message: 'something went wrong' },
    });
  });
});

/* ── End-to-end adapter chain ────────────────────────────────────── */

describe('Full adapter chain', () => {
  it('runs all adapters in pipeline order with data flowing through', async () => {
    const interp = new InterpreterAdapter(fakeInterpreter());
    const router = new RouterAdapter(fakeRouter());
    const weaveAd = new WeaveAdapter(fakeWeave());
    const execAd = new ExecutorAdapter(fakeExecutor());
    const format = new FormatAdapter(fakeFormatter());

    weaveAd.setTraceId('trc_e2e');
    execAd.setTraceId('trc_e2e');

    const intent = await interp.interpret({ message: 'Explain Docker' });
    const route = await router.plan({ intent });
    const context = await weaveAd.assemble({ intent, route, message: 'Explain Docker' });
    const execution = await execAd.execute({ route, context });
    const response = await format.format({ traceId: 'trc_e2e', intent, route, execution });

    expect(response.status).toBe('complete');
    expect(response.content).toContain('Docker');
    expect(response.responseId).toBe('resp_001');
  });
});
