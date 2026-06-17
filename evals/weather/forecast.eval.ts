import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

// Identity comes from the file path: `weather/forecast`.
export default defineEval({
  description: "Weather agent replies with a forecast and calls get_weather.",
  async test(t) {
    await t.send("What is the weather in Brooklyn?");
    t.completed();
    t.calledTool("get_weather");
    t.check(t.reply, includes("Sunny"));
  },
});
