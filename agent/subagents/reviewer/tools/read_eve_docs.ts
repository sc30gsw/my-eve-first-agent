import { defineTool } from "eve/tools";
import {
  executeReadEveDocs,
  READ_EVE_DOCS_DESCRIPTION,
  ReadEveDocsInput,
} from "#lib/read-eve-docs.js";
import { toToolInputSchema } from "#lib/schema.js";

// Thin wrapper — the schema, description, and handler live in #lib/read-eve-docs
// so the researcher and reviewer copies cannot drift.
export default defineTool({
  description: READ_EVE_DOCS_DESCRIPTION,
  inputSchema: toToolInputSchema(ReadEveDocsInput),
  execute: executeReadEveDocs,
});
