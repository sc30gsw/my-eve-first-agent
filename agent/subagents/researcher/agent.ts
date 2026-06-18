import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Researches the eve framework's official docs and returns the facts, APIs, file paths, and quotes the writer needs for each article section.",
  model: "anthropic/claude-haiku-4.5",
});
