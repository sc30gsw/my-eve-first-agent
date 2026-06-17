import { toJsonSchema } from "@valibot/to-json-schema";
import { defineTool } from "eve/tools";
import * as v from "valibot";

type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

const GetWeatherInput = v.object({
  city: v.pipe(v.string(), v.minLength(1)),
});

// Filename is the tool name the model sees: `get_weather`.
export default defineTool({
  description: "Get the current weather for a city.",
  // valibot schema is the single source of truth; toJsonSchema renders the
  // model-facing schema. The cast bridges valibot's JsonSchema type to eve's
  // structural JsonObject (which requires a string index signature).
  inputSchema: toJsonSchema(GetWeatherInput) as Record<string, JsonValue>,
  async execute(args) {
    const { city } = v.parse(GetWeatherInput, args);
    // Placeholder data; swap for a real provider behind a Result boundary.
    return { city, condition: "Sunny", temperatureF: 72 };
  },
});
