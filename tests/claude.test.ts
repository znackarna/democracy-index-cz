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
  it('returns the SDK parsed_output, runs it through the user parse callback', async () => {
    const parse = vi.fn(async () => ({
      content: [{ type: 'text', text: '{"ok":true,"n":42}' }],
      parsed_output: { ok: true, n: 42 },
    }));
    const client = { messages: { parse } } as unknown as Anthropic;
    const result = await callClaudeJson<{ ok: boolean; n: number }>({
      client,
      model: 'm',
      system: 'sys',
      user: 'usr',
      schema: { type: 'object', properties: {} },
      parse: (raw) => raw as { ok: boolean; n: number },
    });
    expect(result).toEqual({ ok: true, n: 42 });
    expect(parse).toHaveBeenCalledOnce();
  });

  it('attaches cache_control to system blocks marked cache:true', async () => {
    const parse = vi.fn(async () => ({
      content: [{ type: 'text', text: '{}' }],
      parsed_output: {},
    }));
    const client = { messages: { parse } } as unknown as Anthropic;
    await callClaudeJson({
      client,
      model: 'm',
      system: [
        { text: 'cached part', cache: true },
        { text: 'volatile part', cache: false },
      ],
      user: 'usr',
      schema: { type: 'object', properties: {} },
      parse: (raw) => raw,
    });
    expect(parse).toHaveBeenCalledOnce();
    const calls = parse.mock.calls as unknown as Array<[{ system: Array<{ cache_control?: unknown }> }]>;
    const systemBlocks = calls[0]![0].system;
    expect(systemBlocks[0]?.cache_control).toEqual({ type: 'ephemeral' });
    expect(systemBlocks[1]?.cache_control).toBeUndefined();
  });

  it('retries once when the SDK reports a transient parse failure, then succeeds', async () => {
    const parse = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('Failed to parse structured output: Unexpected end of JSON input');
      })
      .mockImplementationOnce(async () => ({
        content: [{ type: 'text', text: '{"ok":true}' }],
        parsed_output: { ok: true },
      }));
    const client = { messages: { parse } } as unknown as Anthropic;
    const result = await callClaudeJson({
      client,
      model: 'm',
      system: 'sys',
      user: 'usr',
      schema: { type: 'object', properties: {} },
      parse: (raw) => raw,
    });
    expect(result).toEqual({ ok: true });
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it('propagates the parse error after the retry also fails', async () => {
    const parse = vi.fn(() => {
      throw new Error('Failed to parse structured output: still broken');
    });
    const client = { messages: { parse } } as unknown as Anthropic;
    await expect(
      callClaudeJson({
        client,
        model: 'm',
        system: 'sys',
        user: 'usr',
        schema: { type: 'object', properties: {} },
        parse: (raw) => raw,
      }),
    ).rejects.toThrow(/Failed to parse structured output/);
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on non-parse errors (rate limit, network, validation)', async () => {
    const parse = vi.fn(() => {
      throw new Error('Rate limit exceeded');
    });
    const client = { messages: { parse } } as unknown as Anthropic;
    await expect(
      callClaudeJson({
        client,
        model: 'm',
        system: 'sys',
        user: 'usr',
        schema: { type: 'object', properties: {} },
        parse: (raw) => raw,
      }),
    ).rejects.toThrow(/Rate limit/);
    expect(parse).toHaveBeenCalledOnce();
  });

  it('throws if SDK returns null parsed_output (e.g. response had no text block)', async () => {
    const parse = vi.fn(async () => ({
      content: [],
      parsed_output: null,
    }));
    const client = { messages: { parse } } as unknown as Anthropic;
    await expect(
      callClaudeJson({
        client,
        model: 'm',
        system: 'sys',
        user: 'usr',
        schema: { type: 'object', properties: {} },
        parse: (raw) => raw,
      }),
    ).rejects.toThrow(/null parsed_output/);
  });
});
