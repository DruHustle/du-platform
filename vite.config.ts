import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import basicSsl from "@vitejs/plugin-basic-ssl";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import { createHtmlPlugin } from "vite-plugin-html";

export default defineConfig(({ mode }) => {
  // Load env vars. The third argument "" ensures all variables are loaded, not just those starting with VITE_
  const env = loadEnv(mode, path.resolve(import.meta.dirname), "");
  const siteUrl = (env.VITE_SITE_URL || env.APP_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
  const useDevHttps = env.VITE_DEV_HTTPS !== "false";
  const useJsxLoc = mode !== "production";
  const certDir = path.resolve(import.meta.dirname, ".cert");
  const keyPath = path.join(certDir, "localhost-key.pem");
  const certPath = path.join(certDir, "localhost-cert.pem");
  const hasTrustedLocalCert = fs.existsSync(keyPath) && fs.existsSync(certPath);

  return {
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode === "production" ? "production" : "development"),
    },
    plugins: [
      ...(useDevHttps && !hasTrustedLocalCert ? [basicSsl()] : []),
      react(),
      tailwindcss(),
      ...(useJsxLoc ? [jsxLocPlugin()] : []),
      createHtmlPlugin({
        inject: {
          data: {
            // Mapping variables for EJS replacement in index.html
            VITE_SITE_URL: siteUrl,
            VITE_SITE_NAME: env.VITE_SITE_NAME || "Diaspora Unlocked Platform",
            VITE_ANALYTICS_ENDPOINT: env.VITE_ANALYTICS_ENDPOINT,
            VITE_ANALYTICS_WEBSITE_ID: env.VITE_ANALYTICS_WEBSITE_ID,
          },
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "frontend", "src"),
        "@shared": path.resolve(import.meta.dirname, "frontend", "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    envDir: path.resolve(import.meta.dirname),
    root: path.resolve(import.meta.dirname, "frontend"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      // Terser produces ~15-20% smaller bundles than esbuild minifier
      minify: "terser",
      terserOptions: {
        compress: { drop_console: true, passes: 2 },
        format: { comments: false },
      },
      // Raise the chunk size warning threshold — 3D vendor chunk intentionally large
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            // React core — loaded on every page, cached aggressively
            if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/scheduler/")) {
              return "vendor-react";
            }
            // 3D / XR — large, rarely changes, only needed on globe/VR pages
            if (
              id.includes("node_modules/three/") ||
              id.includes("node_modules/three-globe/") ||
              id.includes("node_modules/@react-three/") ||
              id.includes("node_modules/@pmndrs/")
            ) {
              return "vendor-3d";
            }
            // Charts
            if (id.includes("node_modules/recharts/") || id.includes("node_modules/d3-") || id.includes("node_modules/victory-")) {
              return "vendor-charts";
            }
            // Internationalisation
            if (
              id.includes("node_modules/i18next") ||
              id.includes("node_modules/react-i18next/")
            ) {
              return "vendor-i18n";
            }
            // UI primitives — Radix, lucide, animation, misc components
            if (
              id.includes("node_modules/@radix-ui/") ||
              id.includes("node_modules/lucide-react/") ||
              id.includes("node_modules/framer-motion/") ||
              id.includes("node_modules/cmdk/") ||
              id.includes("node_modules/vaul/") ||
              id.includes("node_modules/sonner/") ||
              id.includes("node_modules/embla-carousel") ||
              id.includes("node_modules/react-day-picker/") ||
              id.includes("node_modules/input-otp/") ||
              id.includes("node_modules/next-themes/") ||
              id.includes("node_modules/react-resizable-panels/")
            ) {
              return "vendor-ui";
            }
          },
        },
      },
    },
    esbuild: {
      jsx: "automatic",
      jsxDev: false,
      jsxImportSource: "react",
    },
    server: {
      port: 3000,
      strictPort: false,
      host: true,
      https: useDevHttps
        ? hasTrustedLocalCert
          ? {
              key: fs.readFileSync(keyPath),
              cert: fs.readFileSync(certPath),
            }
          : true
        : false,
      proxy: {
        // This is the magic bridge!
        '/api': {
          target: env.BACKEND_URL || 'http://localhost:5001',
          changeOrigin: true,
        },
      },
      hmr: {
        clientPort: 3000,
      },
      fs: {
        strict: true,
        deny: ["**/.*"],
      }
    },
  };
});
