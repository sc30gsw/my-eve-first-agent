import { defineState } from "eve/context";
import { defineTool } from "eve/tools";
import * as v from "valibot";
import { toToolInputSchema } from "#lib/schema.js";

const EmitZennMarkdownInput = v.object({
  // Constrained to safe filename characters so the slug cannot traverse out of
  // the articles/ directory when interpolated into the sandbox write path.
  slug: v.pipe(
    v.string(),
    v.minLength(1, "slug is required"),
    v.regex(/^[a-z0-9_-]+$/, "slug must be lowercase letters, digits, hyphen, or underscore"),
  ),
  title: v.pipe(v.string(), v.minLength(1, "title is required")),
  emoji: v.optional(v.string(), "📝"),
  topics: v.array(v.string()),
  body: v.pipe(v.string(), v.minLength(1, "body is required")),
});

type EmitZennMarkdownInput = v.InferOutput<typeof EmitZennMarkdownInput>;

const emittedMarkdown = defineState("article.emit_zenn_markdown", () => ({
  bySlug: {} as Record<string, { markdown: string; path: string }>,
}));

// JSON strings are valid YAML double-quoted scalars, so this escapes quotes,
// newlines, and backslashes uniformly and prevents frontmatter injection (e.g.
// a title/topic/emoji that tries to smuggle in `published: true`).
function yamlString(value: string) {
  return JSON.stringify(value);
}

function renderZennMarkdown(input: EmitZennMarkdownInput) {
  const topics = input.topics.map((topic) => yamlString(topic)).join(", ");
  const frontmatter = [
    "---",
    `title: ${yamlString(input.title)}`,
    `emoji: ${yamlString(input.emoji)}`,
    'type: "tech"',
    `topics: [${topics}]`,
    "published: false",
    "---",
  ].join("\n");

  return `${frontmatter}\n\n${input.body}\n`;
}

// Writes the finalized Zenn-format article into the sandbox workspace at
// /workspace/articles/<slug>.md. Gated on human approval because this is the
// publish boundary the author reviews first. The markdown is returned inline
// because hosted sandbox files are ephemeral and are not directly readable from
// the host.
export default defineTool({
  description:
    "Final-only export tool. Use at most once per slug, and only when the author explicitly asks to emit/export/finalize an already-reviewed article. Do not use during drafting, reviewer review, or Notion review sync. Requires human approval before the first emit for a slug. Writes the finalized Zenn-format article (frontmatter + body) to the sandbox workspace as articles/<slug>.md and returns the complete rendered markdown inline. Hosted sandbox files are ephemeral, so the final answer must include the returned markdown.",
  inputSchema: toToolInputSchema(EmitZennMarkdownInput),
  needsApproval: ({ toolInput }) => {
    const parsed = v.safeParse(EmitZennMarkdownInput, toolInput);

    if (!parsed.success) {
      return true;
    }

    return emittedMarkdown.get().bySlug[parsed.output.slug] === undefined;
  },
  async execute(args, ctx) {
    const input = v.parse(EmitZennMarkdownInput, args);
    const path = `articles/${input.slug}.md`;
    const emitted = emittedMarkdown.get();
    const existing = emitted.bySlug[input.slug];

    if (existing !== undefined) {
      return {
        ok: true as const,
        alreadyEmitted: true as const,
        path: existing.path,
        markdown: existing.markdown,
        note: "This slug was already emitted in this session. Reusing the stored markdown; do not call emit_zenn_markdown again.",
      };
    }

    const markdown = renderZennMarkdown(input);
    const sandbox = await ctx.getSandbox();

    await sandbox.writeTextFile({ path, content: markdown });
    emittedMarkdown.update((state) => ({
      bySlug: {
        ...state.bySlug,
        [input.slug]: { markdown, path },
      },
    }));

    return {
      ok: true as const,
      alreadyEmitted: false as const,
      path,
      markdown,
      note: "The file was written inside the eve sandbox. Hosted sandbox files are ephemeral and not directly readable from the host, so include this markdown in the final reply. Do not call emit_zenn_markdown again.",
    };
  },
});
