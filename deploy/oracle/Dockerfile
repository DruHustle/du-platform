FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile && DU_CATALOGUE_STRATEGY=omit pnpm build
# Export only the backend package and its production dependency graph.
RUN pnpm --filter @du/backend deploy --prod /runtime
FROM node:22-bookworm-slim
ARG APP_REVISION
LABEL org.opencontainers.image.revision=$APP_REVISION
ENV NODE_ENV=production PORT=10000 APP_REVISION=$APP_REVISION SHOP_COMMERCIAL_MODE=prelaunch
WORKDIR /app
COPY --from=build --chown=node:node /runtime ./
# Retain the existing Oracle SPA fallback alongside the standalone API bundle.
COPY --from=build --chown=node:node /app/du-platform-frontend/dist ./dist/public
USER node
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health/db').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
