import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

// Notion is the article workspace. The writer reads the brief and outline from
// the Articles database, writes the draft back to the article page, and updates
// its status. Auth runs through Vercel Connect; the connector was created with
// `vercel connect create https://mcp.notion.com/mcp --name notion`, so its
// connector UID is "mcp.notion.com/notion" (verified via `vercel connect list`).
// Connect-managed OAuth is user-scoped by default: the runtime resolves the
// per-user token before each tool call and kicks off the sign-in flow on a cache
// miss. Vercel Connect brokers the token; it never reaches the model.
export default defineMcpClientConnection({
  url: "https://mcp.notion.com/mcp",
  description:
    "Notion workspace. Read the article brief and outline from the Articles database, write the draft back to the article page, and update its status (todo, review, approved).",
  auth: connect("mcp.notion.com/notion"),
});
