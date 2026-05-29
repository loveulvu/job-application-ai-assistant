package main

import "net/http"

type keywordListResponse struct {
	Items []keywordMatch `json:"items"`
	Count int            `json:"count"`
}

type keywordStatsResponse struct {
	Items []keywordStat `json:"items"`
	Count int           `json:"count"`
}

func (app *application) handleListApplicationKeywords(w http.ResponseWriter, r *http.Request) {
	id, ok := parseIDPathValue(w, r)
	if !ok {
		return
	}

	if _, err := app.getJobApplication(id); isNotFound(err) {
		writeError(w, http.StatusNotFound, "application not found")
		return
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read application")
		return
	}

	items, err := app.listApplicationKeywords(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list application keywords")
		return
	}

	writeJSON(w, http.StatusOK, keywordListResponse{
		Items: items,
		Count: len(items),
	})
}

func (app *application) handleKeywordStats(w http.ResponseWriter, r *http.Request) {
	limit := parseIntQuery(r, "limit", 50)
	if limit < 1 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	category := r.URL.Query().Get("category")

	items, err := app.listKeywordStats(limit, category)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list keyword stats")
		return
	}

	writeJSON(w, http.StatusOK, keywordStatsResponse{
		Items: items,
		Count: len(items),
	})
}
