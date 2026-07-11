// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package webapi

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"mime"
	"net/http"
	"path/filepath"
	"strconv"

	"github.com/micasa-dev/micasa/internal/data"
	"github.com/micasa-dev/micasa/internal/safeconv"
	"gorm.io/gorm"
)

// uploadMemoryLimit bounds the multipart parser's in-memory buffer; larger
// files spill to temp files. The store enforces the real size ceiling.
const uploadMemoryLimit = 32 << 20

func (h *handlers) registerDocuments(mux *http.ServeMux) {
	// Metadata list excludes BLOB data (store selects metadata columns).
	mux.HandleFunc("GET /api/documents", listHandler(h.log, "document",
		func() ([]data.Document, error) { return h.store.ListDocuments(false) }))
	mux.HandleFunc("GET /api/documents/{id}", getHandler(h.log, "document", h.store.GetDocumentMetadata))
	mux.HandleFunc("DELETE /api/documents/{id}", deleteHandler(h.log, "document", h.store.DeleteDocument))

	// Upload: multipart form with fields title, entity_kind, entity_id,
	// notes and the file part named "file".
	mux.HandleFunc("POST /api/documents", func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseMultipartForm(uploadMemoryLimit); err != nil {
			writeError(w, http.StatusBadRequest, "invalid multipart form")
			return
		}
		file, header, err := r.FormFile("file")
		if err != nil {
			writeError(w, http.StatusBadRequest, "missing file part")
			return
		}
		defer file.Close()

		payload, err := io.ReadAll(file)
		if err != nil {
			h.log.Error("read upload", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to read upload")
			return
		}

		mimeType := header.Header.Get("Content-Type")
		if mimeType == "" {
			mimeType = mime.TypeByExtension(filepath.Ext(header.Filename))
		}
		sum := sha256.Sum256(payload)

		title := r.FormValue("title")
		if title == "" {
			title = header.Filename
		}
		doc := data.Document{
			Title:          title,
			FileName:       header.Filename,
			EntityKind:     r.FormValue("entity_kind"),
			EntityID:       r.FormValue("entity_id"),
			Notes:          r.FormValue("notes"),
			MIMEType:       mimeType,
			SizeBytes:      int64(len(payload)),
			ChecksumSHA256: hex.EncodeToString(sum[:]),
			Data:           payload,
		}
		if err := h.store.CreateDocument(&doc); err != nil {
			h.log.Error("create document", "error", err)
			writeError(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		doc.Data = nil // metadata only in the response
		writeJSON(w, http.StatusCreated, doc)
	})

	// Metadata-only update (title/notes); the store preserves the BLOB when
	// Data is empty.
	mux.HandleFunc("PUT /api/documents/{id}", updateHandler(h.log, "document",
		func(d *data.Document, id string) { d.ID = id },
		func(d data.Document) error {
			d.Data = nil
			return h.store.UpdateDocument(d)
		}))

	mux.HandleFunc("GET /api/documents/{id}/download", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		doc, err := h.store.GetDocument(id)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				writeError(w, http.StatusNotFound, "document not found")
				return
			}
			h.log.Error("get document", "error", err, "id", id)
			writeError(w, http.StatusInternalServerError, "failed to get document")
			return
		}
		mimeType := doc.MIMEType
		if mimeType == "" {
			mimeType = "application/octet-stream"
		}
		w.Header().Set("Content-Type", mimeType)
		w.Header().Set("Content-Disposition",
			mime.FormatMediaType("attachment", map[string]string{"filename": doc.FileName}))
		size, err := safeconv.Int(doc.SizeBytes)
		if err == nil && size > 0 {
			w.Header().Set("Content-Length", strconv.Itoa(size))
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(doc.Data)
	})
}
