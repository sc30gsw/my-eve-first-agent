import { defineSandbox } from "eve/sandbox";
import { justbash } from "eve/sandbox/just-bash";

// The agent writes finalized Zenn articles into /workspace/articles via the
// emit_zenn_markdown tool. The just-bash backend persists /workspace to a host
// path under .eve/sandbox-cache/, so the emitted .md is readable on the host
// after an approved run — no VM extraction needed.
export default defineSandbox({
  backend: justbash(),
});
