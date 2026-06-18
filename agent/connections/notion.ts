import { defineMcpClientConnection } from "eve/connections";

// Single-operator agent: authenticate to the Notion MCP with a static Notion
// integration token from the environment. `getToken` runs on every request and
// eve sends the result as `Authorization: Bearer <token>`. With getToken-only
// auth, principalType defaults to "app" — one shared credential across sessions,
// which is exactly what a single-operator agent wants, and it sidesteps the
// per-user Connect consent flow that has no end-user to run against when the
// agent is driven through the eve TUI. Keep NOTION_TOKEN in the deployment env,
// never in source.
export default defineMcpClientConnection({
  url: "https://mcp.notion.com/mcp",
  description:
    "Notion workspace. Read the article brief and outline from the Articles database, write the draft back to the article page, and update its status (todo, review, approved).",
  auth: { getToken: async () => ({ token: process.env.NOTION_TOKEN! }) },
});
