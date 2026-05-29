package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

const (
	statusPending      = "\u5f85\u6295\u9012"
	statusSubmitted    = "\u5df2\u6295\u9012"
	statusCommunicated = "\u5df2\u6c9f\u901a"
	statusInterview    = "\u9762\u8bd5"
	statusRejected     = "\u62d2\u7edd"
)

type updateStatusRequest struct {
	Status string `json:"status"`
}

func (app *application) handleListApplications(w http.ResponseWriter, r *http.Request) {
	limit := parseIntQuery(r, "limit", 20)
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	offset := parseIntQuery(r, "offset", 0)
	if offset < 0 {
		offset = 0
	}

	result, err := app.listJobApplications(limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list applications")
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (app *application) handleGetApplication(w http.ResponseWriter, r *http.Request) {
	id, ok := parseIDPathValue(w, r)
	if !ok {
		return
	}

	result, err := app.getJobApplication(id)
	if isNotFound(err) {
		writeError(w, http.StatusNotFound, "application not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read application")
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (app *application) handlePatchApplicationStatus(w http.ResponseWriter, r *http.Request) {
	id, ok := parseIDPathValue(w, r)
	if !ok {
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var input updateStatusRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	input.Status = strings.TrimSpace(input.Status)
	if !isAllowedApplicationStatus(input.Status) {
		writeError(w, http.StatusBadRequest, "invalid status")
		return
	}

	result, err := app.updateJobApplicationStatus(id, input.Status)
	if isNotFound(err) {
		writeError(w, http.StatusNotFound, "application not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update application status")
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func parseIntQuery(r *http.Request, name string, fallback int) int {
	value := strings.TrimSpace(r.URL.Query().Get(name))
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func parseIDPathValue(w http.ResponseWriter, r *http.Request) (int, bool) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id < 1 {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return 0, false
	}

	return id, true
}

func isAllowedApplicationStatus(status string) bool {
	switch status {
	case statusPending, statusSubmitted, statusCommunicated, statusInterview, statusRejected:
		return true
	default:
		return false
	}
}
