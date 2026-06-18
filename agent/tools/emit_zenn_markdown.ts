import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
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
// publish boundary the author reviews first.
export default defineTool({
  description:
    "Write the finalized Zenn-format article (frontmatter + body) to the sandbox workspace as articles/<slug>.md. Requires human approval before it runs.",
  inputSchema: toToolInputSchema(EmitZennMarkdownInput),
  needsApproval: always(),
  async execute(args, ctx) {
    const input = v.parse(EmitZennMarkdownInput, args);
    const path = `articles/${input.slug}.md`;
    const markdown = renderZennMarkdown(input);
    const sandbox = await ctx.getSandbox();

    await sandbox.writeTextFile({ path, content: markdown });

    // Return the rendered markdown inline so the author can retrieve the article
    // straight from the reply — on Vercel the sandbox workspace is ephemeral and
    // is not readable from the host.
    return { ok: true as const, path, markdown };
  },
});
