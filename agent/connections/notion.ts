import { connect } from "@vercel/connect/eve";
import { defineMcpClientConnection } from "eve/connections";

export default defineMcpClientConnection({
  url: "https://mcp.notion.com/mcp",
  description:
    "Notion workspace for the Articles database. Workflow: discover Notion tools once, search by article title, fetch the row for Brief/outline, then use a discovered Notion update/write tool to write the revised draft and set status (todo, review, approved). Do not invent Notion tool names; use only tool names returned by connection__search.",
  auth: connect({
    connector: "mcp.notion.com/notion",
    instructions: "Authorize Notion in your browser to let this agent read and update Articles.",
  }),
});
