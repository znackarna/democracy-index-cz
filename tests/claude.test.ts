import type Anthropic from '@anthropic-ai/sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { callClaudeJson, getDefaultClient, resetDefaultClient } from '../src/lib/claude';

afterEach(() => {
  delete process.env['ANTHROPIC_API_KEY'];
  resetDefaultClient();
});

describe('getDefaultClient', () => {
  it('throws when ANTHROPIC_API_KEY is missing', () => {
    expect(() => getDefaultClient()).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('returns and memoizes a client when the key is set', () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-test-fake';
    const a = getDefaultClient();
    const b = getDefaultClient();
    expect(a).toBe(b);
  });
});

describe('callClaudeJson', () => {
  it('parses JSON returned in the first text block', async () => {
    const create = vi.fn(async () => ({
      content: [{ type: 'text', text: '{"ok": true, "n": 42}' }],
    }));
    const client = { messages: { create } } as unknown as Anthropic;
    const result = await callClaudeJson<{ ok: boolean; n: number }>({
      client,
      model: 'm',
      system: 'sys',
      user: 'usr',
      schema: { type: 'object' },
      parse: (raw) => raw as { ok: boolean; n: number },
    });
    expect(result).toEqual({ ok: true, n: 42 });
    expect(create).toHaveBeenCalledOnce();
  });

  it('attaches cache_control to system blocks marked cache:true', async () => {
    const create = vi.fn(async () => ({ content: [{ type: 'text', text: '{}' }] }));
    const client = { messages: { create } } as unknown as Anthropic;
    await callClaudeJson({
      client,
      model: 'm',
      system: [
        { text: 'cached part', cache: true },
        { text: 'volatile part', cache: false },
      ],
      user: 'usr',
      schema: {},
      parse: (raw) => raw,
    });
    expect(create).toHaveBeenCalledOnce();
    // create.mock.calls is typed as never[] when the fn is async () => ... — cast.
    const calls = create.mock.calls as unknown as Array<[{ system: Array<{ cache_control?: unknown }> }]>;
    const systemBlocks = calls[0]![0].system;
    expect(systemBlocks[0]?.cache_control).toEqual({ type: 'ephemeral' });
    expect(systemBlocks[1]?.cache_control).toBeUndefined();
  });

  it('throws a helpful error when the response is not valid JSON', async () => {
    const create = vi.fn(async () => ({ content: [{ type: 'text', text: 'not json' }] }));
    const client = { messages: { create } } as unknown as Anthropic;
    await expect(
      callClaudeJson({
        client,
        model: 'm',
        system: 'sys',
        user: 'usr',
        schema: {},
        parse: (raw) => raw,
      }),
    ).rejects.toThrow(/not valid JSON/);
  });
});
