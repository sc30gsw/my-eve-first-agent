import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Reviews an article draft against eve's docs for accuracy and against the Zenn house style, and returns actionable findings.",
  model: "anthropic/claude-haiku-4.5",
});
