import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMAS_DIR = path.resolve(__dirname, '..', '..', 'schemas');

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[];
}

export interface Validator {
  validate(data: unknown): ValidationResult;
}

export type SchemaName = 'event' | 'score' | 'structural';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validatorCache = new Map<SchemaName, ValidateFunction>();

export async function getValidator(name: SchemaName): Promise<Validator> {
  let fn = validatorCache.get(name);
  if (!fn) {
    const schemaPath = path.join(SCHEMAS_DIR, `${name}.schema.json`);
    const raw = await readFile(schemaPath, 'utf-8');
    const schema = JSON.parse(raw) as Record<string, unknown>;
    fn = ajv.compile(schema);
    validatorCache.set(name, fn);
  }
  return {
    validate(data: unknown): ValidationResult {
      const valid = fn(data) as boolean;
      return { valid, errors: valid ? [] : (fn.errors ?? []) };
    },
  };
}

/** Validate a single object; returns the typed value or throws with all error messages. */
export async function validateOrThrow<T>(name: SchemaName, data: unknown): Promise<T> {
  const v = await getValidator(name);
  const result = v.validate(data);
  if (!result.valid) {
    const summary = result.errors
      .map((e) => `  ${e.instancePath || '/'} ${e.message ?? ''}`.trim())
      .join('\n');
    throw new Error(`Schema validation failed for ${name}:\n${summary}`);
  }
  return data as T;
}

/** Validate an array of objects; returns valid items and aggregated errors per index. */
export async function validateMany<T>(
  name: SchemaName,
  items: readonly unknown[],
): Promise<{ valid: T[]; invalid: Array<{ index: number; errors: ErrorObject[] }> }> {
  const v = await getValidator(name);
  const valid: T[] = [];
  const invalid: Array<{ index: number; errors: ErrorObject[] }> = [];
  items.forEach((item, index) => {
    const result = v.validate(item);
    if (result.valid) valid.push(item as T);
    else invalid.push({ index, errors: result.errors });
  });
  return { valid, invalid };
}

/** For tests: clear the in-memory schema cache between runs. */
export function _resetValidatorCacheForTests(): void {
  validatorCache.clear();
}
