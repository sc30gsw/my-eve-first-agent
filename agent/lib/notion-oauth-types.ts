import * as v from "valibot";

// Shared OAuth schemas and types for the Notion MCP connection. This module
// imports only valibot (nothing from the OAuth client or the token store), so
// the connection slot, the OAuth client, and the token store can all reference
// these types without importing one another — which keeps the module graph
// acyclic.

export const TokenRecordSchema = v.object({
  accessToken: v.pipe(v.string(), v.minLength(1)),
  clientId: v.pipe(v.string(), v.minLength(1)),
  expiresAt: v.optional(v.number()),
  refreshToken: v.optional(v.string()),
});

export type TokenRecord = v.InferOutput<typeof TokenRecordSchema>;

export const TokenResponseSchema = v.object({
  access_token: v.pipe(v.string(), v.minLength(1)),
  expires_in: v.optional(v.number()),
  refresh_token: v.optional(v.string()),
  token_type: v.optional(v.string()),
});

export type NotionTokenResponse = v.InferOutput<typeof TokenResponseSchema>;

// PKCE flow state carried from `startAuthorization` to `completeAuthorization`.
// Defined here (not in the connection slot) so the OAuth client and the token
// store can reference its field types without importing the slot — keeping the
// module graph acyclic.
export type NotionResume = {
  clientId: string;
  redirectUri: string;
  state: string;
  verifier: string;
};
