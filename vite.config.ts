import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Deployment target is picked from NITRO_PRESET env var.
//   - Vercel:        NITRO_PRESET=vercel        (set automatically in vercel.json)
//   - Render (Node): NITRO_PRESET=node-server   (set in render.yaml / Dockerfile)
//   - Local dev/build defaults to node-server so `npm run build && npm start` works
//     anywhere without Cloudflare-specific tooling.
const preset = process.env.NITRO_PRESET || "node-server";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  nitro: {
    preset,
  },
});
