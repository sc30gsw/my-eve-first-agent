import { Result } from "better-result";
import * as v from "valibot";
import { listEveDocs, readEveDoc } from "#lib/eve-docs.js";

// Shared logic for the read_eve_docs tool. eve resolves a declared subagent's
// tools from its own tools/ directory, so each subagent needs its own
// defineTool file — but the schema, description, and handler live here once and
// the per-subagent files are thin wrappers around them.
export const READ_EVE_DOCS_DESCRIPTION =
  'Read eve\'s local documentation. Omit `path` or pass `path: ""` to list every available doc; pass a listed path to read that file\'s full contents.';

export const ReadEveDocsInput = v.object({
  path: v.optional(v.string()),
});

export async function executeReadEveDocs(args: unknown) {
  const { path } = v.parse(ReadEveDocsInput, args);

  if (path === undefined || path.trim() === "") {
    const docs = await listEveDocs();

    return { ok: true as const, docs };
  }

  const result = await readEveDoc(path);

  if (Result.isError(result)) {
    return { ok: false as const, message: result.error.message };
  }

  return { ok: true as const, path, content: result.value };
}
