import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 5173;
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    // The proxied Replit preview serves the app on :5000. Disabling the
    // direct HMR socket avoids a noisy failed websocket in that iframe while
    // keeping the server stable for preview and production builds.
    hmr: false,
    proxy: {
      "/api": {
        target: "http://localhost:9000",
        changeOrigin: true,
      },
      "/api/socket.io": {
        target: "http://localhost:9000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: { port, host: "0.0.0.0", allowedHosts: true },
});
