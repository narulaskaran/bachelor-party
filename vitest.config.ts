import path from "node:path";
import { defineConfig } from "vitest/config";

// Vitest doesn't read tsconfig.json's "paths" the way Next.js's own
// build does, so the "@/*" alias needs to be declared here too.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
