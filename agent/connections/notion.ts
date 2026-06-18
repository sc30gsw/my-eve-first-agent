import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  url: "https://mcp.notion.com/mcp",
  description:
    "Notion workspace for the Articles database. Workflow: notion-search by article title -> notion-fetch the row for Brief/outline -> update_page to write the revised draft and set status (todo, review, approved). Call connection__search once with connection=notion to discover these tools; do not repeat search while authorization is pending.",
  tools: {
    allow: ["notion-search", "notion-fetch", "update_page"],
  },
  auth: connect({
    connector: "mcp.notion.com/notion",
    instructions: "Authorize Notion in your browser to let this agent read and update Articles.",
  }),
});
