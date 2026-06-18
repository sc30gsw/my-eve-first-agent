import { Result } from "better-result";
import {
  ConnectionAuthorizationFailedError,
  ConnectionAuthorizationRequiredError,
  defineInteractiveAuthorization,
  defineMcpClientConnection,
} from "eve/connections";
import type { NotionResume, NotionTokenResponse, TokenRecord } from "#lib/notion-oauth-types.js";
import {
  buildAuthorizeUrl,
  createPkcePair,
  createState,
  exchangeAuthorizationCode,
  refreshAccessToken,
  registerClient,
} from "#lib/notion-oauth.js";
import {
  principalCacheKey,
  readClientId,
  readTokenRecord,
  writeClientId,
  writeTokenRecord,
} from "#lib/notion-kv-store.js";

// The hosted Notion MCP is OAuth-only (it rejects static integration tokens), so
// authentication runs eve's interactive sign-in: `getToken` throws
// `ConnectionAuthorizationRequiredError` on a cache miss, eve surfaces the
// authorize URL in the TUI, and `completeAuthorization` exchanges the returned
// code for a token. Interactive OAuth is `principalType: "user"`, which the
// deployed TUI only obtains via the operator principal minted in
// `agent/channels/eve.ts`. Tokens persist in `#lib/notion-kv-store`.

const CONNECTION_NAME = "notion";
const REFRESH_SKEW_MS = 60_000;

type TokenResult = { expiresAt?: number; token: string };

function toTokenRecord(
  response: NotionTokenResponse,
  clientId: string,
  previousRefreshToken?: string,
): TokenRecord {
  return {
    accessToken: response.access_token,
    clientId,
    expiresAt:
      response.expires_in === undefined ? undefined : Date.now() + response.expires_in * 1000,
    refreshToken: response.refresh_token ?? previousRefreshToken,
  };
}

// Refresh an expired token or, if that is impossible, require a fresh sign-in.
async function refreshOrRequire(record: TokenRecord, cacheKey: string): Promise<TokenResult> {
  if (record.refreshToken === undefined) {
    throw new ConnectionAuthorizationRequiredError(CONNECTION_NAME);
  }

  const refreshed = await refreshAccessToken({
    clientId: record.clientId,
    refreshToken: record.refreshToken,
  });

  if (Result.isError(refreshed)) {
    throw new ConnectionAuthorizationRequiredError(CONNECTION_NAME);
  }

  const updated = toTokenRecord(refreshed.value, record.clientId, record.refreshToken);

  await writeTokenRecord(cacheKey, updated);

  return { expiresAt: updated.expiresAt, token: updated.accessToken };
}

// Reuse the dynamically-registered client for this callback URL, or register one.
async function ensureClientId(callbackUrl: string): Promise<string> {
  const existing = await readClientId(callbackUrl);

  if (existing !== undefined) {
    return existing;
  }

  const registered = await registerClient(callbackUrl);

  if (Result.isError(registered)) {
    throw new ConnectionAuthorizationFailedError(CONNECTION_NAME, {
      message: registered.error.message,
      reason: "registration_failed",
    });
  }

  await writeClientId(callbackUrl, registered.value);

  return registered.value;
}

// Validate the OAuth redirect params and return the authorization code.
function authorizationCodeFromCallback(
  params: Record<string, string>,
  expectedState: string,
): string {
  const callbackError = params.error;

  if (callbackError !== undefined) {
    throw new ConnectionAuthorizationFailedError(CONNECTION_NAME, {
      message: `Notion denied authorization: ${callbackError}`,
      reason: callbackError,
      retryable: false,
    });
  }

  const code = params.code;

  if (!code) {
    throw new ConnectionAuthorizationFailedError(CONNECTION_NAME, {
      message: "authorization callback did not include a code",
      retryable: false,
    });
  }

  if (params.state !== expectedState) {
    throw new ConnectionAuthorizationFailedError(CONNECTION_NAME, {
      message: "authorization state mismatch",
      retryable: false,
    });
  }

  return code;
}

export default defineMcpClientConnection({
  url: "https://mcp.notion.com/mcp",
  description:
    "Notion workspace. Read the article brief and outline from the Articles database, write the draft back to the article page, and update its status (todo, review, approved).",
  auth: defineInteractiveAuthorization<NotionResume>({
    async getToken({ principal }) {
      const cacheKey = principalCacheKey(principal);
      const record = await readTokenRecord(cacheKey);

      if (record === undefined) {
        throw new ConnectionAuthorizationRequiredError(CONNECTION_NAME);
      }

      const stillFresh =
        record.expiresAt === undefined || record.expiresAt - REFRESH_SKEW_MS > Date.now();

      if (stillFresh) {
        return { expiresAt: record.expiresAt, token: record.accessToken };
      }

      return await refreshOrRequire(record, cacheKey);
    },
    async startAuthorization({ callbackUrl }) {
      const clientId = await ensureClientId(callbackUrl);
      const { codeChallenge, verifier } = createPkcePair();
      const state = createState();

      return {
        challenge: {
          displayName: "Notion",
          url: buildAuthorizeUrl({ clientId, codeChallenge, redirectUri: callbackUrl, state }),
        },
        resume: { clientId, redirectUri: callbackUrl, state, verifier },
      };
    },
    async completeAuthorization({ callback, principal, resume }) {
      if (resume === undefined) {
        throw new ConnectionAuthorizationFailedError(CONNECTION_NAME, {
          message: "authorization state was lost before completion",
          retryable: false,
        });
      }

      const code = authorizationCodeFromCallback(callback.params, resume.state);
      const exchanged = await exchangeAuthorizationCode({
        clientId: resume.clientId,
        code,
        codeVerifier: resume.verifier,
        redirectUri: resume.redirectUri,
      });

      if (Result.isError(exchanged)) {
        throw new ConnectionAuthorizationFailedError(CONNECTION_NAME, {
          message: exchanged.error.message,
          reason: "token_exchange_failed",
        });
      }

      const record = toTokenRecord(exchanged.value, resume.clientId);
      await writeTokenRecord(principalCacheKey(principal), record);

      return { expiresAt: record.expiresAt, token: record.accessToken };
    },
  }),
});
