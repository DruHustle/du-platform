FROM node:22-bookworm-slim AS frontend-build
WORKDIR /frontend
RUN corepack enable
COPY du-platform-frontend/ ./
RUN pnpm install --frozen-lockfile && DU_CATALOGUE_STRATEGY=omit pnpm build

FROM node:22-bookworm-slim AS backend-build
WORKDIR /backend
RUN corepack enable
COPY du-platform-backend/ ./
RUN pnpm install --frozen-lockfile && pnpm build && pnpm prune --prod

FROM node:22-bookworm-slim
ARG APP_REVISION
LABEL org.opencontainers.image.revision=$APP_REVISION
ENV NODE_ENV=production PORT=10000 APP_REVISION=$APP_REVISION SHOP_COMMERCIAL_MODE=prelaunch
WORKDIR /app
COPY --from=backend-build --chown=node:node /backend/node_modules ./node_modules
COPY --from=backend-build --chown=node:node /backend/package.json ./package.json
COPY --from=backend-build --chown=node:node /backend/dist ./dist
# Deployment composes independently built static files with the standalone API.
COPY --from=frontend-build --chown=node:node /frontend/dist ./dist/public
USER node
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health/db').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
