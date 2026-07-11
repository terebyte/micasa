# Copyright 2026 Phillip Cloud
# Licensed under the Apache License, Version 2.0

# Multi-stage build for the micasa web server (API + embedded SPA).
# Build context is the repository root:
#   docker build -f deploy/web/Dockerfile .

FROM node:22-alpine AS frontend
WORKDIR /src/web
RUN corepack enable
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY web/ ./
RUN pnpm build

FROM golang:1.26-alpine AS backend
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /src/web/dist ./web/dist
RUN CGO_ENABLED=0 go build -o /out/micasa-web ./cmd/web

FROM scratch
COPY --from=backend /out/micasa-web /bin/micasa-web
VOLUME /data
EXPOSE 8080
ENTRYPOINT ["/bin/micasa-web", "--db", "/data/micasa.db"]
