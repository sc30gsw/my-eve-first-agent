import * as v from "valibot";
import { type NotionResume, type TokenRecord, TokenRecordSchema } from "#lib/notion-oauth-types.js";

// Durable token storage for the Notion MCP OAuth flow.
//
// eve caches a resolved connection token only per workflow step, so across
// steps and turns `getToken` is re-probed against a fresh context. To avoid
// re-prompting the operator for a browser sign-in on every Notion tool call,
// the access/refresh tokens (and the dynamically-registered client id) are
// persisted here. When Vercel KV / Upstash REST env vars are present the tokens
// live in Redis (durable across serverless invocations); otherwise they fall
// back to an in-process map that only survives within a single warm instance.

type PrincipalLike = { type: "app" } | { id: string; issuer: string; type: "user" };

// Mirrors eve's internal principal cache key so tokens are scoped per caller.
export function principalCacheKey(principal: PrincipalLike) {
  return principal.type === "app" ? "app" : `user:${principal.issuer}:${principal.id}`;
}

type KvConfig = { token: string; url: string };

function readEnv(...names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function kvConfig(): KvConfig | undefined {
  const url = readEnv("KV_REST_API_URL", "UPSTASH_REDIS_REST_URL");
  const token = readEnv("KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN");

  if (url === undefined || token === undefined) {
    return undefined;
  }

  return { token, url };
}

const memoryStore = new Map<string, string>();
let warnedAboutMemoryStore = false;

const KvResultSchema = v.object({ result: v.nullable(v.union([v.string(), v.number()])) });

async function runKvCommand(config: KvConfig, command: readonly string[]) {
  const response = await fetch(config.url, {
    body: JSON.stringify(command),
    headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`KV command failed: ${response.status} ${await response.text()}`);
  }

  return v.parse(KvResultSchema, await response.json()).result;
}

async function getRaw(key: string): Promise<string | undefined> {
  const config = kvConfig();

  if (config === undefined) {
    return memoryStore.get(key);
  }

  const result = await runKvCommand(config, ["GET", key]);

  return typeof result === "string" ? result : undefined;
}

async function setRaw(key: string, value: string) {
  const config = kvConfig();

  if (config === undefined) {
    if (!warnedAboutMemoryStore) {
      warnedAboutMemoryStore = true;
      console.warn(
        "[notion] No KV_REST_API_URL / UPSTASH_REDIS_REST_URL configured: Notion OAuth tokens are kept in-process only and will not survive serverless cold starts. Provision Vercel KV to avoid repeated sign-ins.",
      );
    }

    memoryStore.set(key, value);

    return;
  }

  await runKvCommand(config, ["SET", key, value]);
}

const TOKEN_PREFIX = "notion:token:";
const CLIENT_PREFIX = "notion:client:";

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export async function readTokenRecord(key: string): Promise<TokenRecord | undefined> {
  const raw = await getRaw(TOKEN_PREFIX + key);

  if (raw === undefined) {
    return undefined;
  }

  const parsed = v.safeParse(TokenRecordSchema, safeJsonParse(raw));

  return parsed.success ? parsed.output : undefined;
}

export async function writeTokenRecord(key: string, record: TokenRecord) {
  await setRaw(TOKEN_PREFIX + key, JSON.stringify(record));
}

export async function readClientId(
  redirectUri: NotionResume["redirectUri"],
): Promise<string | undefined> {
  return await getRaw(CLIENT_PREFIX + redirectUri);
}

export async function writeClientId(
  redirectUri: NotionResume["redirectUri"],
  clientId: TokenRecord["clientId"],
) {
  await setRaw(CLIENT_PREFIX + redirectUri, clientId);
}
