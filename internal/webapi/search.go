// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package webapi

import "net/http"

// searchResult mirrors data.EntitySearchResult with explicit JSON tags
// (the data type has none because it is scanned straight from FTS rows).
type searchResult struct {
	EntityType string `json:"entity_type"`
	EntityID   string `json:"entity_id"`
	EntityName string `json:"entity_name"`
}

func (h *handlers) search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	results, err := h.store.SearchEntities(query)
	if err != nil {
		h.log.Error("search entities", "error", err, "query", query)
		writeError(w, http.StatusInternalServerError, "search failed")
		return
	}
	out := make([]searchResult, 0, len(results))
	for _, res := range results {
		out = append(out, searchResult{
			EntityType: res.EntityType,
			EntityID:   res.EntityID,
			EntityName: res.EntityName,
		})
	}
	writeJSON(w, http.StatusOK, out)
}
