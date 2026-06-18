import { eveChannel } from "eve/channels/eve";
import { localDev, vercelOidc } from "eve/channels/auth";

export default eveChannel({
  auth: [
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
    // Lets the eve TUI and your Vercel deployments reach the deployed agent.
    // Production browser traffic is blocked at the platform layer by Vercel
    // Deployment Protection (Vercel Authentication), so only the owner's Vercel
    // team can reach the app; vercelOidc() backs the API contract.
    vercelOidc(),
  ],
});
