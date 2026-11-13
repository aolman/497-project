import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The app calls /api/...; Vite forwards those requests to the FastAPI server on port 8000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
