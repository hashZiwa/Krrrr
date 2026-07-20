import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
  test: {
    environment: "jsdom",
  },
});
