import { type AuthFn, extractBearerToken, localDev, verifyVercelOidc } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

// eve v1 restricts interactive connection OAuth (the Notion MCP browser sign-in)
// to `principalType: "user"`. The eve TUI driving the deployed app authenticates
// as the Vercel *project* (a non-user OIDC principal), so without a user
// principal in the session the Notion connection can never start its sign-in
// flow. `operatorAuth` accepts exactly the callers `vercelOidc()` already trusts
// (a valid Vercel OIDC token for this project/environment), then maps them to a
// single fixed operator user so connection auth has a stable per-user
// token-cache key. This is a single-operator agent: every trusted caller shares
// the operator identity.
function operatorAuth(): AuthFn<Request> {
  return async (request) => {
    const result = await verifyVercelOidc(extractBearerToken(request.headers.get("authorization")));
    if (!result.ok) return null;
    return {
      attributes: {},
      authenticator: "oidc",
      issuer: "tui-operator",
      principalId: "operator",
      principalType: "user",
    };
  };
}

export default eveChannel({
  auth: [
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
    // The eve TUI → deployed app path: a trusted Vercel OIDC caller is mapped to
    // the operator user principal so the Notion MCP interactive sign-in can run.
    operatorAuth(),
  ],
});
