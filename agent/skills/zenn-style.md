---
description: Use when writing or revising article prose for Zenn in the author's (sc30gsw) voice — tone, title and emoji conventions, formatting, and house patterns.
---

# Zenn style guide (sc30gsw)

Patterns extracted from the author's Zenn articles. Write body only (frontmatter is added by `emit_zenn_markdown`).

## Voice and tone

- Polite です・ます form. First-person builder perspective: "実際に触ってみました", "作ってみました".
- Not overly assertive, but opinions are welcome. Strong at comparison pieces and "which should you pick?" framing.
- Avoid hype and marketing language. Write concrete takeaways from hands-on work (what worked / what gave pause).
- One forward-looking thread through the piece (e.g. "〜が示す新しい形", "〜の先へ").

## Title (candidates for emit's `title` / `emoji`)

- One emoji at the start. Optional `【tag】` prefix (e.g. `【eve】`).
- Subtitle states the claim: `main topic — claim` (full-width dash `—`).

## Structure and formatting

- Start with `## はじめに`; end with `## まとめ`.
- Headings use `##` / `###`. One topic per section.
- Always tag code blocks with a language (ts / sh / text, etc.). Keep examples minimal but meaningful.
- List "what it does" as declarative bullet points.
- Weave links to official docs, Core Concepts, and sample repos naturally into the body.
- Keep technical terms in English; explain in Japanese.

## Do not

- Write long, thin preambles or boilerplate greetings.
- Describe APIs or behavior not backed by docs (only facts from the researcher's notes).
