import { Result } from "better-result";
import { defineTool } from "eve/tools";
import * as v from "valibot";
import { listEveDocs, readEveDoc } from "#lib/eve-docs.js";
import { toToolInputSchema } from "#lib/schema.js";

const ReadEveDocsInput = v.object({
  path: v.optional(v.string()),
});

// Reads eve's local docs so the reviewer fact-checks claims against real source.
export default defineTool({
  description:
    "Read eve's local documentation. Omit `path` to list every available doc; pass a listed path to read that file's full contents.",
  inputSchema: toToolInputSchema(ReadEveDocsInput),
  async execute(args) {
    const { path } = v.parse(ReadEveDocsInput, args);
    if (path === undefined) {
      const docs = await listEveDocs();
      return { ok: true as const, docs };
    }
    const result = await readEveDoc(path);
    if (Result.isError(result)) {
      return { ok: false as const, message: result.error.message };
    }
    return { ok: true as const, path, content: result.value };
  },
});
