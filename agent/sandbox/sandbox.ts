import { defineSandbox, defaultBackend } from "eve/sandbox";

// defaultBackend() selects Vercel Sandbox on hosted builds and a local backend
// during `eve dev` — one definition, both environments. The emit_zenn_markdown
// tool still writes articles/<slug>.md into the workspace, but it now also
// returns the finalized markdown inline, so retrieval no longer depends on a
// host-persisted workspace path (the Vercel Sandbox workspace is ephemeral).
export default defineSandbox({
  backend: defaultBackend(),
});
