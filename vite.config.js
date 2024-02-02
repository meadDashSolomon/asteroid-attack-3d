const { defineConfig } = require("vite");

export default defineConfig({
  root: "src/",
  publicDir: "../static/",
  base: "./",
  server: { port: 2024 },
});
