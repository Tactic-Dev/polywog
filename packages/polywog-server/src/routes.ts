import { Router } from 'express';
import { polywogRunInputSchema } from '@polywog/core';
import type { PolywogRunInput } from '@polywog/core';
import { core } from './core-instance.js';

export const router = Router();

router.post('/api/run', async (req, res) => {
  const parsed = polywogRunInputSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.issues,
    });
    return;
  }

  try {
    const input = parsed.data as PolywogRunInput;
    const result = await core.run(input);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

router.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.get('/api/config', (_req, res) => {
  res.json({
    modules: ['interpreter', 'router', 'weave', 'executor', 'format', 'ledger'],
    pipeline: ['interpreter', 'router', 'weave', 'executor', 'format'],
    version: '1.0.0',
  });
});
