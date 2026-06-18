import { toJsonSchema } from "@valibot/to-json-schema";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

// Renders a valibot schema into the model-facing JSON Schema that a tool's
// `inputSchema` expects. The cast bridges valibot's JsonSchema type to eve's
// structural JsonObject (which requires a string index signature).
export function toToolInputSchema(
  schema: Parameters<typeof toJsonSchema>[0],
): Record<string, JsonValue> {
  return toJsonSchema(schema) as Record<string, JsonValue>;
}
