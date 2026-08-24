FROM node:20-bookworm-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# medusa build evaluates medusa-config.ts. These are build-only placeholders;
# the runner receives real production values from deploy/env/backend.env.
ENV NODE_ENV=production \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    STORE_CORS=http://localhost:8000 \
    ADMIN_CORS=http://localhost:9000 \
    AUTH_CORS=http://localhost:8000,http://localhost:9000 \
    JWT_SECRET=build-only-jwt-secret \
    COOKIE_SECRET=build-only-cookie-secret

RUN corepack enable

WORKDIR /server

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/storefront/package.json apps/storefront/package.json

RUN pnpm install --frozen-lockfile --filter @dtc/backend...

COPY . .

RUN pnpm -C apps/backend build


FROM node:20-bookworm-slim AS runner

ENV NODE_ENV=production
WORKDIR /server

COPY --from=builder /server/apps/backend/.medusa/server ./

RUN npm install --omit=dev \
    && chown -R node:node /server

USER node

EXPOSE 9000

CMD ["npm", "run", "start", "--", "--host", "0.0.0.0", "--port", "9000"]
