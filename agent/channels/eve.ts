import { type AuthFn, extractBearerToken, localDev, verifyVercelOidc } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

const operatorUser = {
  attributes: {},
  authenticator: "operator",
  issuer: "tui-operator",
  principalId: "operator",
  principalType: "user",
} as const;

// User-scoped connection OAuth (Notion MCP) requires a `principalType: "user"`.
// This agent is single-operator: trusted local/dev callers share one stable
// operator identity, which gives Vercel Connect one token subject to authorize.
function operatorAuth(): AuthFn<Request> {
  return async (request) => {
    const result = await verifyVercelOidc(extractBearerToken(request.headers.get("authorization")));
    if (!result.ok) return null;
    return { ...operatorUser, authenticator: "oidc" };
  };
}

function localOperatorAuth(): AuthFn<Request> {
  const allowLocalDev = localDev();

  return async (request) => {
    const localAuth = await allowLocalDev(request);
    return localAuth === null || localAuth === undefined ? null : operatorUser;
  };
}

export default eveChannel({
  auth: [
    // Open on localhost as the operator user for `eve dev` and the REPL.
    localOperatorAuth(),
    // The eve TUI -> deployed app path: trusted Vercel OIDC callers are mapped
    // to the same operator user so Notion MCP interactive sign-in can run.
    operatorAuth(),
  ],
});
