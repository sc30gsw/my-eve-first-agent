import { defineEval } from "eve/evals";

// id: article/intro. Drives the writer with an inline brief (so the run needs no
// Notion), asserts it delegated research then review, and that the run does not
// fail. The publish step (emit_zenn_markdown) is approval-gated, so leaving it
// unanswered keeps the eval side-effect-free: no draft is written, nothing ships.
export default defineEval({
  description:
    "Article agent researches eve, then reviews the draft, before the approval-gated publish step.",
  async test(t) {
    await t.send(
      [
        "Write the eve introduction article using the brief below. Do not use Notion; use this brief directly.",
        "title: eve 入門 — ディレクトリがエージェント",
        "brief: Based on the Vercel blog post 'Introducing eve', introduce the problems eve solves and each building block. Write the article in Japanese.",
        "tone: Hands-on builder voice (手を動かした人の語り口).",
      ].join("\n"),
    );
    t.didNotFail();
    t.calledSubagent("researcher");
    t.calledSubagent("reviewer");
    // Subagent delegations are tracked as subagent events, not in the tool-name
    // order stream, so calledSubagent (above) is the right ordering proof.
    // messageIncludes scans all assistant text, not just the final reply.
    t.messageIncludes("eve");
  },
});
