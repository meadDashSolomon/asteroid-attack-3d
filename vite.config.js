import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

export default defineConfig({
  export default defineConfig({
    root: "src/",
    publicDir: "static",
    base: "./",
    server: { port: 2024 },
    plugins: [glsl()],
    build: {
      outDir: "./dist",
    },
  });
