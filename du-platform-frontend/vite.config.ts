import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import basicSsl from "@vitejs/plugin-basic-ssl";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import { createHtmlPlugin } from "vite-plugin-html";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(import.meta.dirname, ".."), "");
  const siteUrl = (
    env.VITE_SITE_URL ||
    env.APP_BASE_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
  const useDevHttps = env.VITE_DEV_HTTPS !== "false";
  const useJsxLoc = mode !== "production";

  const certDir = path.resolve(import.meta.dirname, "..", ".cert");
  const keyPath = path.join(certDir, "localhost-key.pem");
  const certPath = path.join(certDir, "localhost-cert.pem");
  const hasTrustedLocalCert = fs.existsSync(keyPath) && fs.existsSync(certPath);

  return {
    define: {
      // Using 'mode' directly is cleaner than manual stringification
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    plugins: [
      ...(useDevHttps && !hasTrustedLocalCert ? [basicSsl()] : []),
      react(),
      tailwindcss(),
      ...(useJsxLoc ? [jsxLocPlugin()] : []),
      createHtmlPlugin({
        inject: {
          data: {
            VITE_SITE_URL: siteUrl,
            VITE_SITE_NAME: env.VITE_SITE_NAME || "Diaspora Unlocked Platform",
            VITE_ANALYTICS_ENDPOINT: env.VITE_ANALYTICS_ENDPOINT || "",
            VITE_ANALYTICS_WEBSITE_ID: env.VITE_ANALYTICS_WEBSITE_ID || "",
          },
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@shared": path.resolve(import.meta.dirname, "..", "shared"),
        "@assets": path.resolve(import.meta.dirname, "..", "attached_assets"),
      },
    },
    envDir: path.resolve(import.meta.dirname, ".."),
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "..", "dist/public"),
      emptyOutDir: true,
      minify: "terser",
      terserOptions: {
        compress: {
          // Only drop consoles in production to allow dev debugging
          drop_console: mode === "production",
          passes: 2,
        },
        format: { comments: false },
      },
      // Higher limit is fine for 3D apps, but we aim for better splitting via React.lazy
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          // Standardized naming convention for better caching
          assetFileNames: "assets/[name]-[hash][extname]",
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
        },
      },
    },
    esbuild: {
      jsx: "automatic",
      jsxDev: mode !== "production",
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
        "/api": {
          target: env.BACKEND_URL || "http://localhost:5001",
          changeOrigin: true,
        },
      },
      fs: {
        strict: true,
        allow: [path.resolve(import.meta.dirname, "..")],
        deny: ["**/.*"],
      },
    },
  };
});
