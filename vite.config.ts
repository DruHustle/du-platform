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
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    envDir: path.resolve(import.meta.dirname),
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
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
