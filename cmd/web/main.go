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
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/micasa-dev/micasa/internal/data"
	"github.com/micasa-dev/micasa/internal/webapi"
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

	srv := &http.Server{
		Addr:              *addr,
		Handler:           webapi.NewRouter(store, log),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Info("micasa web listening", "addr", *addr, "db", *dbPath)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	<-sig

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Error("shutdown", "error", err)
	}
}
