import {defineConfig} from "vite";
import path from "path";

import react, {reactCompilerPreset} from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import checker from "vite-plugin-checker";

export default defineConfig({
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()]
    }),
    checker({
      typescript: true,
      enableBuild: false,
      overlay: {
        initialIsOpen: false
      }
    })
  ],
  root: "./client",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./client/src")
    }
  },
  build: {
    outDir: "../public",
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000
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
