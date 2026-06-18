---
description: Use when outlining or drafting the eve introduction article — the section flow, what each section must cover, and how eve's building blocks map onto the narrative.
---

# eve introduction article structure

Follow the author's (sc30gsw) "trying out a framework" pattern. Each section is written only from facts the researcher verified against docs.

## 1. Introduction

- Open with the problem framing: agent development, like web before frameworks, has everyone hand-wiring the same plumbing (durable execution, sandbox, approval, resume…) every time.
- What eve changes in one line: it ships production concerns from the start and ends that repetition.
- Lead with the core experience (e.g. "look at the directory and you know what the agent does").
- Preview what this article covers (concept + each building block + hands-on takeaways).
- Link to the sample/repo (the repo of the agent that wrote this article).

## 2. What is eve — directories are agents

- Central concept: the file layout under `agent/` is the agent definition (filesystem-first; paths are identity).
- Show the minimal layout (`agent.ts` + `instructions.md`) as a file tree, with one minimal `defineAgent` / `defineTool` example.

## 3. Building blocks one by one

In file-tree order, briefly explain each slot and when to add it.
`tools/` / `skills/` / `connections/` / `subagents/` / `channels/` / `schedules/` / `sandbox/` / `evals/` / durable sessions (pause/resume, human-in-the-loop).
Each block gets one paragraph plus minimal code when needed. Prioritize "why add this" over exhaustive coverage.

## 4. What we built

- Use this article-writing agent itself as the subject; describe the parts you actually implemented from a "we built it" angle:
  tools (`read_eve_docs` / `emit_zenn_markdown`), skills, connection (Notion), subagents (researcher / reviewer), human approval (publish gate), sandbox, evals, durable sessions.
- List "what it does" as declarative bullet points.
- Use the meta framing once: this article explains eve's parts, and an agent that uses those parts wrote it.

## 5. Notes / explanation-only parts

- Honest takeaways (pain points, current constraints).
- State clearly that `hooks` and `schedules` are not implemented in this agent—explanation only.

## 6. Conclusion

- One line on when to choose eve. Close with links to official docs, GitHub, and Get started (`npx eve@latest init`).
