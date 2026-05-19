import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';

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
  // maxRetries: 5 (default 2) — survives the typical 30–60 s Anthropic
  // capacity spike that returns HTTP 529 "Overloaded". The SDK retries
  // on 408/409/429/5xx with exponential backoff, so this gives us
  // roughly 30 s of patience before the pipeline gives up — well within
  // the 30 min workflow timeout. Tradeoff: a persistent outage delays
  // the failure signal by a couple of minutes, which we accept because
  // most overloads clear within seconds.
  _defaultClient = new Anthropic({ apiKey, maxRetries: 5 });
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
  /**
   * Raw JSON Schema with `type: "object"` at the root. The SDK helper
   * `jsonSchemaOutputFormat()` strictifies it (adds `additionalProperties: false`,
   * strips unsupported constraints) before sending to the API.
   */
  schema: Record<string, unknown>;
  maxTokens?: number;
  /** Optional post-validation hook applied after the SDK parses parsed_output. */
  parse: (raw: unknown) => T;
}

const MAX_PARSE_RETRIES = 1;

/**
 * Single-shot JSON call against the Messages API using `messages.parse()`
 * with `jsonSchemaOutputFormat()` for server-side schema enforcement and
 * SDK-side parsing.
 *
 * `system` accepts either a plain string (no caching) or an array of segments,
 * each optionally marked `cache: true` to attach `cache_control: ephemeral`.
 * Use the array form to keep a stable methodology prefix in cache while the
 * tail (per-batch instructions) varies.
 *
 * Why `messages.parse()` over `messages.create()` + manual `JSON.parse`:
 * the helper passes the schema through `transformJSONSchema()` which adds
 * `additionalProperties: false` and other strictness, making the model's
 * output much more reliable. The SDK also surfaces parse errors with
 * structured error types so we can distinguish transient JSON malformation
 * (worth retrying) from genuine logic errors (don't retry).
 *
 * Retry policy: one retry on `Failed to parse structured output` errors.
 * Non-deterministic sampling means the same prompt usually succeeds on the
 * second attempt. Other error classes (rate limit, network, validation
 * against `parse` callback) propagate immediately.
 */
export async function callClaudeJson<T>(opts: CallClaudeJsonOptions<T>): Promise<T> {
  const client = opts.client ?? getDefaultClient();
  const systemBlocks = normalizeSystem(opts.system);

  const params = {
    model: opts.model,
    max_tokens: opts.maxTokens ?? 16000,
    system: systemBlocks,
    output_config: {
      format: jsonSchemaOutputFormat(opts.schema as never),
    },
    messages: [{ role: 'user' as const, content: opts.user }],
  };

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_PARSE_RETRIES; attempt += 1) {
    try {
      const response = await client.messages.parse(params);
      const parsed = response.parsed_output;
      if (parsed === null) {
        throw new Error(
          'Claude messages.parse returned null parsed_output (no text block in response).',
        );
      }
      return opts.parse(parsed);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_PARSE_RETRIES && isTransientParseError(err)) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * Detects the SDK's structured-output parse failure. Matches
 * `AnthropicError("Failed to parse structured output: ...")` from
 * `lib/parser.js`. Other errors (4xx, 5xx, network, validation by user
 * `parse` callback) intentionally don't retry.
 */
function isTransientParseError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return err.message.includes('Failed to parse structured output');
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
