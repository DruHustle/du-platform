import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import basicSsl from "@vitejs/plugin-basic-ssl";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import { createHtmlPlugin } from "vite-plugin-html";

const THREE_VENDOR_PACKAGES = new Set([
  "three",
  "@react-three/fiber",
  "@react-three/drei",
  "@react-three/xr",
  "three-stdlib",
]);

const GLOBE_VENDOR_PACKAGES = new Set(["react-globe.gl", "three-globe"]);
const I18N_VENDOR_PACKAGES = new Set(["i18next", "react-i18next", "i18next-browser-languagedetector", "i18next-http-backend"]);
const REACT_VENDOR_PACKAGES = new Set(["react", "react-dom", "scheduler"]);

function getPackageNameFromId(id: string): string | null {
  const marker = "/node_modules/";
  const markerIndex = id.lastIndexOf(marker);
  if (markerIndex < 0) return null;

  const packagePath = id.slice(markerIndex + marker.length);
  if (!packagePath) return null;

  const segments = packagePath.split("/");
  if (segments.length === 0) return null;
  if (segments[0].startsWith("@")) {
    if (segments.length < 2) return null;
    return `${segments[0]}/${segments[1]}`;
  }
  return segments[0];
}

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
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.split(path.sep).join("/");
            if (!normalizedId.includes("/node_modules/")) return undefined;

            const packageName = getPackageNameFromId(normalizedId);
            if (!packageName) return undefined;

            if (THREE_VENDOR_PACKAGES.has(packageName)) return "vendor-three";
            if (GLOBE_VENDOR_PACKAGES.has(packageName)) return "vendor-globe";
            if (I18N_VENDOR_PACKAGES.has(packageName)) return "vendor-i18n";
            if (REACT_VENDOR_PACKAGES.has(packageName)) return "vendor-react";

            return undefined;
          },
        },
      },
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
