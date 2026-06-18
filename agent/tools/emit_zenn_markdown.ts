import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import * as v from "valibot";
import { toToolInputSchema } from "#lib/schema.js";

const EmitZennMarkdownInput = v.object({
  slug: v.pipe(v.string(), v.minLength(1, "slug is required")),
  title: v.pipe(v.string(), v.minLength(1, "title is required")),
  emoji: v.optional(v.string(), "📝"),
  topics: v.array(v.string()),
  body: v.pipe(v.string(), v.minLength(1, "body is required")),
});

type EmitZennMarkdownInput = v.InferOutput<typeof EmitZennMarkdownInput>;

function renderZennMarkdown(input: EmitZennMarkdownInput) {
  const title = input.title.replaceAll('"', '\\"');
  const topics = input.topics.map((topic) => `"${topic}"`).join(", ");
  const frontmatter = [
    "---",
    `title: "${title}"`,
    `emoji: "${input.emoji}"`,
    'type: "tech"',
    `topics: [${topics}]`,
    "published: false",
    "---",
  ].join("\n");

  return `${frontmatter}\n\n${input.body}\n`;
}

// Writes the finalized Zenn-format article into the sandbox workspace. Gated on
// human approval because this is the publish boundary the author reviews first.
export default defineTool({
  description:
    "Write the finalized Zenn-format article (frontmatter + body) to the sandbox workspace as articles/<slug>.md. Requires human approval before it runs.",
  inputSchema: toToolInputSchema(EmitZennMarkdownInput),
  needsApproval: always(),
  async execute(args, ctx) {
    const input = v.parse(EmitZennMarkdownInput, args);
    const path = `articles/${input.slug}.md`;
    const sandbox = await ctx.getSandbox();

    await sandbox.writeTextFile({ path, content: renderZennMarkdown(input) });

    return { ok: true as const, path };
  },
});
