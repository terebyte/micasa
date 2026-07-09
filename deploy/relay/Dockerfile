# Copyright 2026 Phillip Cloud
# Licensed under the Apache License, Version 2.0

# golang 1.26-alpine
FROM golang@sha256:079e59808d2d252516e27e3f3a9c003740dee7f75e55aa71528766d52bcfc16a AS build
ARG BUILD_TAGS
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath ${BUILD_TAGS:+-tags "$BUILD_TAGS"} -o /relay ./cmd/relay

# distroless static-debian12
FROM gcr.io/distroless/static-debian12@sha256:22fd79fd75eab2372585b44517f8a094349938919dc613aafc37e4bdc9967c82
COPY --from=build /relay /relay
EXPOSE 8080
ENTRYPOINT ["/relay"]
