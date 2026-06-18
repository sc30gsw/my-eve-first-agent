import { createHash, randomBytes } from "node:crypto";
import { Result, TaggedError } from "better-result";
import * as v from "valibot";
import {
  type NotionResume,
  type TokenRecord,
  TokenResponseSchema,
} from "#lib/notion-oauth-types.js";

// OAuth 2.0 (PKCE) client for the hosted Notion MCP server. Endpoints come from
// https://mcp.notion.com/.well-known/oauth-authorization-server. The server
// supports Dynamic Client Registration with public clients
// (`token_endpoint_auth_method: "none"`) and `S256` PKCE, so no pre-registered
// client id or client secret is required.

const REGISTRATION_ENDPOINT = "https://mcp.notion.com/register";
const AUTHORIZATION_ENDPOINT = "https://mcp.notion.com/authorize";
const TOKEN_ENDPOINT = "https://mcp.notion.com/token";
const CLIENT_NAME = "my-eve-first-agent";

class NotionOAuthError extends TaggedError("NotionOAuthError")<{
  cause?: unknown;
  message: string;
}>() {}

function base64Url(input: Buffer) {
  return input.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function createPkcePair() {
  const verifier = base64Url(randomBytes(32));
  const codeChallenge = base64Url(createHash("sha256").update(verifier).digest());

  return { codeChallenge, verifier };
}

export function createState() {
  return base64Url(randomBytes(16));
}

const RegisterResponseSchema = v.object({ client_id: v.pipe(v.string(), v.minLength(1)) });

export function registerClient(redirectUri: NotionResume["redirectUri"]) {
  return Result.tryPromise({
    catch: (cause) =>
      new NotionOAuthError({ cause, message: "Notion dynamic client registration failed" }),
    try: async () => {
      const response = await fetch(REGISTRATION_ENDPOINT, {
        body: JSON.stringify({
          client_name: CLIENT_NAME,
          grant_types: ["authorization_code", "refresh_token"],
          redirect_uris: [redirectUri],
          response_types: ["code"],
          token_endpoint_auth_method: "none",
        }),
        headers: { accept: "application/json", "content-type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`registration responded ${response.status}: ${await response.text()}`);
      }

      return v.parse(RegisterResponseSchema, await response.json()).client_id;
    },
  });
}

export function buildAuthorizeUrl(opts: {
  clientId: TokenRecord["clientId"];
  codeChallenge: NotionResume["verifier"];
  redirectUri: NotionResume["redirectUri"];
  state: NotionResume["state"];
}) {
  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", opts.clientId);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("code_challenge", opts.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", opts.state);

  return url.toString();
}

function requestToken(form: Record<string, string>) {
  return Result.tryPromise({
    catch: (cause) => new NotionOAuthError({ cause, message: "Notion token request failed" }),
    try: async () => {
      const response = await fetch(TOKEN_ENDPOINT, {
        body: new URLSearchParams(form).toString(),
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`token endpoint responded ${response.status}: ${await response.text()}`);
      }
      
      return v.parse(TokenResponseSchema, await response.json());
    },
  });
}

export function exchangeAuthorizationCode(opts: {
  clientId: TokenRecord["clientId"];
  code: string;
  codeVerifier: NotionResume["verifier"];
  redirectUri: NotionResume["redirectUri"];
}) {
  return requestToken({
    client_id: opts.clientId,
    code: opts.code,
    code_verifier: opts.codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: opts.redirectUri,
  });
}

export function refreshAccessToken(opts: {
  clientId: TokenRecord["clientId"];
  refreshToken: string;
}) {
  return requestToken({
    client_id: opts.clientId,
    grant_type: "refresh_token",
    refresh_token: opts.refreshToken,
  });
}
