// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package webapi_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/micasa-dev/micasa/internal/data"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAssetWithRoom(t *testing.T) {
	srv := newTestServer(t)

	resp := doJSON(t, http.MethodPost, srv.URL+"/api/rooms", `{"name":"작업실","floor":8}`)
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	room := decode[data.Room](t, resp)

	resp = doJSON(t, http.MethodPost, srv.URL+"/api/assets",
		`{"name":"아이패드","category":"전자기기","room_id":"`+room.ID+`","cost_cents":120000000}`)
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	asset := decode[data.Asset](t, resp)
	require.NotNil(t, asset.RoomID)
	assert.Equal(t, room.ID, *asset.RoomID)
}

func TestConsumableLowStockInDashboardAndDigest(t *testing.T) {
	srv := newTestServer(t)

	resp := doJSON(t, http.MethodPost, srv.URL+"/api/consumables",
		`{"name":"공기청정기 필터","quantity":1,"min_quantity":2,"unit":"개"}`)
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	_ = resp.Body.Close()
	resp = doJSON(t, http.MethodPost, srv.URL+"/api/consumables",
		`{"name":"AA 배터리","quantity":10,"min_quantity":4,"unit":"개"}`)
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	_ = resp.Body.Close()

	dash, err := http.Get(srv.URL + "/api/dashboard")
	require.NoError(t, err)
	var body struct {
		LowStock []data.Consumable `json:"low_stock_consumables"`
	}
	require.NoError(t, json.NewDecoder(dash.Body).Decode(&body))
	_ = dash.Body.Close()
	require.Len(t, body.LowStock, 1)
	assert.Equal(t, "공기청정기 필터", body.LowStock[0].Name)
}

func TestMonthlyFixedCost(t *testing.T) {
	srv := newTestServer(t)

	// 30,000 won monthly + 120,000 won yearly (10,000/month) + paused.
	for _, payload := range []string{
		`{"name":"인터넷","amount_cents":3000000,"interval":"monthly"}`,
		`{"name":"보험","amount_cents":12000000,"interval":"yearly"}`,
		`{"name":"해지한 OTT","amount_cents":990000,"interval":"monthly","paused":true}`,
	} {
		resp := doJSON(t, http.MethodPost, srv.URL+"/api/expenses", payload)
		require.Equal(t, http.StatusCreated, resp.StatusCode)
		_ = resp.Body.Close()
	}

	dash, err := http.Get(srv.URL + "/api/dashboard")
	require.NoError(t, err)
	var body struct {
		Monthly int64 `json:"monthly_fixed_cost_cents"`
	}
	require.NoError(t, json.NewDecoder(dash.Body).Decode(&body))
	_ = dash.Body.Close()
	assert.Equal(t, int64(4000000), body.Monthly, "30k + 120k/12 = 40k won in cents")
}

func TestExpenseRecordsLifecycle(t *testing.T) {
	srv := newTestServer(t)

	resp := doJSON(t, http.MethodPost, srv.URL+"/api/expenses",
		`{"name":"관리비","amount_cents":20000000,"interval":"monthly"}`)
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	expense := decode[data.RecurringExpense](t, resp)

	resp = doJSON(t, http.MethodPost, srv.URL+"/api/expenses/"+expense.ID+"/records",
		`{"period":"2026-07","amount_cents":18734000,"notes":"여름 전기 포함"}`)
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	record := decode[data.ExpenseRecord](t, resp)
	assert.Equal(t, "2026-07", record.Period)

	resp, err := http.Get(srv.URL + "/api/expenses/" + expense.ID + "/records")
	require.NoError(t, err)
	assert.Len(t, decode[[]data.ExpenseRecord](t, resp), 1)

	// Deleting the expense is blocked while records exist.
	req, _ := http.NewRequest(http.MethodDelete, srv.URL+"/api/expenses/"+expense.ID, nil)
	resp, err = http.DefaultClient.Do(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusConflict, resp.StatusCode)
	_ = resp.Body.Close()

	req, _ = http.NewRequest(http.MethodDelete, srv.URL+"/api/expense-records/"+record.ID, nil)
	resp, err = http.DefaultClient.Do(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusNoContent, resp.StatusCode)

	req, _ = http.NewRequest(http.MethodDelete, srv.URL+"/api/expenses/"+expense.ID, nil)
	resp, err = http.DefaultClient.Do(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNoContent, resp.StatusCode)
}

func TestExpenseRecordOnMissingExpense(t *testing.T) {
	srv := newTestServer(t)
	resp := doJSON(t, http.MethodPost, srv.URL+"/api/expenses/nope/records",
		`{"period":"2026-07","amount_cents":1}`)
	assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	_ = resp.Body.Close()
}
