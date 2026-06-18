import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

// Notion is the article workspace. The writer reads the brief and outline from
// the Articles database, writes the draft back to the article page, and updates
// its status. Auth runs through Vercel Connect; the connector was created with
// `vercel connect create mcp.notion.com --name notion`, so its OAuth UID is
// "oauth/notion". The token is resolved per user/call and never reaches the model.
export default defineMcpClientConnection({
  url: "https://mcp.notion.com/mcp",
  description:
    "Notion workspace. Read the article brief and outline from the Articles database, write the draft back to the article page, and update its status (todo, review, approved).",
  auth: connect("oauth/notion"),
});
