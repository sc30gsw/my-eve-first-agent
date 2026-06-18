import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { Result, TaggedError } from "better-result";

// Source of truth for eve facts: the installed framework docs plus the article
// source committed to this repo. Reading locally keeps the research matched to
// the installed eve version and needs no network or auth.
const DOC_ROOTS = [
  "node_modules/eve/docs",
  "docs/for-article",
] as const satisfies readonly string[];
const DOC_ROOT_PATHS = DOC_ROOTS.map((root) => resolve(process.cwd(), root));

class DocReadError extends TaggedError("DocReadError")<{
  message: string;
  path: string;
  cause?: unknown;
}>() {}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [] as Dirent[]);
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        return walk(full);
      }

      if (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")) {
        return [full];
      }

      return [];
    }),
  );
  return nested.flat();
}

export async function listEveDocs() {
  const perRoot = await Promise.all(DOC_ROOT_PATHS.map((root) => walk(root)));

  return perRoot.flat().map((path) => relative(process.cwd(), path));
}

export async function readEveDoc(path: string) {
  const candidate = resolve(process.cwd(), path);
  const within = DOC_ROOT_PATHS.some(
    (root) => candidate === root || candidate.startsWith(`${root}${sep}`),
  );

  if (!within) {
    return Result.err(
      new DocReadError({ message: `path is outside the eve docs roots: ${path}`, path }),
    );
  }

  return Result.tryPromise({
    try: () => readFile(candidate, "utf8"),
    catch: (cause) => new DocReadError({ cause, message: `failed to read eve doc: ${path}`, path }),
  });
}
