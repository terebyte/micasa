// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

// Command web serves the micasa REST API (and, later, the embedded web UI).
// It reuses internal/data.Store so the web layer stays in feature parity with
// the TUI: both read and write the same SQLite database.
package main

import (
	"context"
	"errors"
	"flag"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/micasa-dev/micasa/internal/data"
	"github.com/micasa-dev/micasa/internal/webapi"
	"github.com/micasa-dev/micasa/web"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	dbPath := flag.String("db", "", "path to the micasa SQLite database (required)")
	addr := flag.String("addr", ":8080", "listen address")
	seedDemo := flag.Bool("seed-demo", false, "seed demo data into the database (dev only)")
	flag.Parse()

	if *dbPath == "" {
		log.Error("missing required flag: -db")
		os.Exit(2)
	}

	store, err := data.Open(*dbPath)
	if err != nil {
		log.Error("open database", "error", err)
		os.Exit(1)
	}
	defer store.Close()

	// Matches the TUI's default document size ceiling (config-driven there).
	if err := store.SetMaxDocumentSize(50 << 20); err != nil {
		log.Error("set max document size", "error", err)
		os.Exit(1)
	}

	// AutoMigrate is idempotent: a no-op on an already-migrated database,
	// and required to bootstrap a fresh one for development.
	if err := store.AutoMigrate(); err != nil {
		log.Error("migrate database", "error", err)
		os.Exit(1)
	}
	if *seedDemo {
		if err := store.SeedDefaults(); err != nil {
			log.Error("seed defaults", "error", err)
			os.Exit(1)
		}
		if err := store.SeedDemoData(); err != nil {
			log.Error("seed demo data", "error", err)
			os.Exit(1)
		}
	}

	// Build the FTS index so /api/search works; household-scale data makes
	// a full rebuild at boot effectively free.
	if err := store.RebuildFTSIndex(); err != nil {
		log.Error("rebuild fts index", "error", err)
		os.Exit(1)
	}

	dist, err := fs.Sub(web.Dist, "dist")
	if err != nil {
		log.Error("embedded dist", "error", err)
		os.Exit(1)
	}

	srv := &http.Server{
		Addr:              *addr,
		Handler:           withSPA(webapi.NewRouter(store, log), spaHandler(dist)),
		ReadHeaderTimeout: 10 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Daily Discord digest (overdue/upcoming maintenance, open incidents).
	go runReminderLoop(ctx, store, log)

	go func() {
		log.Info("micasa web listening", "addr", *addr, "db", *dbPath)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error("shutdown", "error", err)
	}
}
