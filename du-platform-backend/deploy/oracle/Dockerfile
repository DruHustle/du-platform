FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY ./ ./
RUN pnpm build && pnpm prune --prod
FROM node:22-bookworm-slim
ARG APP_REVISION
LABEL org.opencontainers.image.revision=$APP_REVISION \
      org.opencontainers.image.source="https://github.com/DruHustle/du-platform"
ENV NODE_ENV=production PORT=10000 APP_REVISION=$APP_REVISION SHOP_COMMERCIAL_MODE=prelaunch
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/assets ./assets
USER node
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health/db').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
