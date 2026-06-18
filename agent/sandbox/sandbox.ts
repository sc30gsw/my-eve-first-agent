import { defaultBackend, defineSandbox } from "eve/sandbox";

// The agent writes finalized Zenn articles into /workspace/articles via the
// emit_zenn_markdown tool. defaultBackend picks the best available runtime
// (Vercel Sandbox when hosted, otherwise a local backend).
export default defineSandbox({
  backend: defaultBackend(),
});
