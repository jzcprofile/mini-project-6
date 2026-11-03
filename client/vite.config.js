const path = require("node:path");
const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");

module.exports = defineConfig({
    root: __dirname,
    plugins: [react()],
    server: {
        proxy: {
            "/api": "http://localhost:3000"
        }
    },
    build: {
        outDir: path.resolve(__dirname, "../public/client"),
        emptyOutDir: true
    }
});
