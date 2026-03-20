import {defineConfig} from "vite";

import react from "@vitejs/plugin-react";
import checker from "vite-plugin-checker";

export default defineConfig({
  plugins: [
    react(),
    checker({
      typescript: true,
      enableBuild: false,
      overlay: {
        initialIsOpen: false
      }
    })
  ],
  root: "./client",
  build: {
    outDir: "../public",
    emptyOutDir: true
  },
  server: {
    proxy: {
      "/socket.io": {
        target: "http://localhost:3000",
        ws: true
      },
      "/files": {
        target: "http://localhost:3000"
      }
    }
  }
});
