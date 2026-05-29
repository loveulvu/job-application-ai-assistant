package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

type resumeProfile struct {
	ID             int      `json:"id"`
	Name           string   `json:"name"`
	TargetPosition string   `json:"target_position"`
	Skills         []string `json:"skills"`
	Projects       []string `json:"projects"`
	Summary        string   `json:"summary"`
	CreatedAt      string   `json:"created_at"`
	UpdatedAt      string   `json:"updated_at"`
}

type resumeProfileInput struct {
	Name           string   `json:"name"`
	TargetPosition string   `json:"target_position"`
	Skills         []string `json:"skills"`
	Projects       []string `json:"projects"`
	Summary        string   `json:"summary"`
}

func (app *application) handleGetResumeProfile(w http.ResponseWriter, r *http.Request) {
	profile, err := app.getResumeProfile()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read resume profile")
		return
	}

	writeJSON(w, http.StatusOK, profile)
}

func (app *application) handlePutResumeProfile(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var input resumeProfileInput
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	input.normalize()

	profile, err := app.updateResumeProfile(input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update resume profile")
		return
	}

	writeJSON(w, http.StatusOK, profile)
}

func (input *resumeProfileInput) normalize() {
	input.Name = strings.TrimSpace(input.Name)
	input.TargetPosition = strings.TrimSpace(input.TargetPosition)
	input.Summary = strings.TrimSpace(input.Summary)
	input.Skills = compactTextList(input.Skills)
	input.Projects = compactTextList(input.Projects)
}

func compactTextList(values []string) []string {
	if values == nil {
		return []string{}
	}

	result := make([]string, 0, len(values))
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value != "" {
			result = append(result, value)
		}
	}

	return result
}

func (app *application) getResumeProfile() (resumeProfile, error) {
	const query = `SELECT
		id,
		name,
		target_position,
		skills,
		projects,
		summary,
		created_at,
		updated_at
	FROM resume_profiles
	WHERE id = 1`

	var profile resumeProfile
	var skillsJSON string
	var projectsJSON string

	err := app.db.QueryRow(query).Scan(
		&profile.ID,
		&profile.Name,
		&profile.TargetPosition,
		&skillsJSON,
		&projectsJSON,
		&profile.Summary,
		&profile.CreatedAt,
		&profile.UpdatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		if _, insertErr := app.db.Exec(`INSERT INTO resume_profiles (id) VALUES (1)`); insertErr != nil {
			return resumeProfile{}, insertErr
		}
		return app.getResumeProfile()
	}
	if err != nil {
		return resumeProfile{}, err
	}

	if err := json.Unmarshal([]byte(skillsJSON), &profile.Skills); err != nil {
		return resumeProfile{}, err
	}
	if err := json.Unmarshal([]byte(projectsJSON), &profile.Projects); err != nil {
		return resumeProfile{}, err
	}

	return profile, nil
}

func (app *application) updateResumeProfile(input resumeProfileInput) (resumeProfile, error) {
	skillsJSON, err := json.Marshal(input.Skills)
	if err != nil {
		return resumeProfile{}, err
	}

	projectsJSON, err := json.Marshal(input.Projects)
	if err != nil {
		return resumeProfile{}, err
	}

	const statement = `INSERT INTO resume_profiles (
		id,
		name,
		target_position,
		skills,
		projects,
		summary,
		created_at,
		updated_at
	) VALUES (1, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
	ON CONFLICT(id) DO UPDATE SET
		name = excluded.name,
		target_position = excluded.target_position,
		skills = excluded.skills,
		projects = excluded.projects,
		summary = excluded.summary,
		updated_at = CURRENT_TIMESTAMP`

	if _, err := app.db.Exec(
		statement,
		input.Name,
		input.TargetPosition,
		string(skillsJSON),
		string(projectsJSON),
		input.Summary,
	); err != nil {
		return resumeProfile{}, err
	}

	return app.getResumeProfile()
}
