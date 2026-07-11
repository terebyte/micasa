// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

// Package web embeds the built frontend (dist/) into the Go binary so
// cmd/web ships as a single artifact. Run `pnpm build` in web/ first;
// without it only dist/.gitkeep is embedded and cmd/web serves an
// actionable 503 for UI routes (the API still works).
package web

import "embed"

//go:embed all:dist
var Dist embed.FS
