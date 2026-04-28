import Anthropic from '@anthropic-ai/sdk';

export const HAIKU_MODEL = 'claude-haiku-4-5';
export const SONNET_MODEL = 'claude-sonnet-4-6';

let _defaultClient: Anthropic | null = null;

export function getDefaultClient(): Anthropic {
  if (_defaultClient !== null) return _defaultClient;
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Set it in .env or your shell before running pipeline modules.',
    );
  }
  _defaultClient = new Anthropic({ apiKey });
  return _defaultClient;
}

export function resetDefaultClient(): void {
  _defaultClient = null;
}

export interface CallClaudeJsonOptions<T> {
  client?: Anthropic;
  model: string;
  system: string | Array<{ text: string; cache?: boolean }>;
  user: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
  parse: (raw: unknown) => T;
}

/**
 * Single-shot JSON call against the Messages API.
 *
 * `system` accepts either a plain string (no caching) or an array of segments,
 * each optionally marked `cache: true` to attach `cache_control: ephemeral`.
 * Use the array form to keep a stable methodology prefix in cache while the
 * tail (per-batch instructions) varies.
 */
export async function callClaudeJson<T>(opts: CallClaudeJsonOptions<T>): Promise<T> {
  const client = opts.client ?? getDefaultClient();
  const systemBlocks = normalizeSystem(opts.system);

  const response = await client.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 16000,
    system: systemBlocks,
    output_config: {
      format: { type: 'json_schema', schema: opts.schema as never },
    },
    messages: [{ role: 'user', content: opts.user }],
  });

  const text = extractText(response);
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `Claude response was not valid JSON: ${(err as Error).message}\nResponse text: ${text.slice(0, 500)}`,
    );
  }
  return opts.parse(parsedJson);
}

function normalizeSystem(
  system: string | Array<{ text: string; cache?: boolean }>,
): Anthropic.TextBlockParam[] {
  if (typeof system === 'string') {
    return [{ type: 'text', text: system }];
  }
  return system.map((block) => {
    const param: Anthropic.TextBlockParam = { type: 'text', text: block.text };
    if (block.cache) {
      param.cache_control = { type: 'ephemeral' };
    }
    return param;
  });
}

function extractText(response: Anthropic.Message): string {
  const parts: string[] = [];
  for (const block of response.content) {
    if (block.type === 'text') {
      parts.push(block.text);
    }
  }
  return parts.join('');
}
