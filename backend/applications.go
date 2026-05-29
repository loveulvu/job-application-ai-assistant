package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"log"
)

const defaultApplicationStatus = "\u5f85\u6295\u9012"

type jobApplicationResponse struct {
	ID                int            `json:"id"`
	Company           string         `json:"company"`
	Position          string         `json:"position"`
	JDText            string         `json:"jd_text,omitempty"`
	MatchScore        int            `json:"match_score"`
	RiskLevel         string         `json:"risk_level"`
	MatchedPoints     []string       `json:"matched_points"`
	MissingPoints     []string       `json:"missing_points"`
	ResumeSuggestions []string       `json:"resume_suggestions"`
	MessageDraft      string         `json:"message_draft"`
	Status            string         `json:"status"`
	Keywords          []keywordMatch `json:"keywords"`
	CreatedAt         string         `json:"created_at"`
	UpdatedAt         string         `json:"updated_at"`
}

type jobApplicationListItem struct {
	ID         int    `json:"id"`
	Company    string `json:"company"`
	Position   string `json:"position"`
	MatchScore int    `json:"match_score"`
	RiskLevel  string `json:"risk_level"`
	Status     string `json:"status"`
	CreatedAt  string `json:"created_at"`
	UpdatedAt  string `json:"updated_at"`
}

type jobApplicationListResponse struct {
	Items []jobApplicationListItem `json:"items"`
	Count int                      `json:"count"`
}

func (app *application) createJobApplication(input analyzeJobRequest, analysis aiAnalysisResult) (jobApplicationResponse, error) {
	matchedPointsJSON, err := json.Marshal(analysis.MatchedPoints)
	if err != nil {
		return jobApplicationResponse{}, err
	}

	missingPointsJSON, err := json.Marshal(analysis.MissingPoints)
	if err != nil {
		return jobApplicationResponse{}, err
	}

	resumeSuggestionsJSON, err := json.Marshal(analysis.ResumeSuggestions)
	if err != nil {
		return jobApplicationResponse{}, err
	}

	const statement = `INSERT INTO job_applications (
		company,
		position,
		jd_text,
		match_score,
		risk_level,
		matched_points,
		missing_points,
		resume_suggestions,
		message_draft,
		status
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	result, err := app.db.Exec(
		statement,
		input.Company,
		input.Position,
		input.JDText,
		analysis.MatchScore,
		analysis.RiskLevel,
		string(matchedPointsJSON),
		string(missingPointsJSON),
		string(resumeSuggestionsJSON),
		analysis.MessageDraft,
		defaultApplicationStatus,
	)
	if err != nil {
		return jobApplicationResponse{}, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return jobApplicationResponse{}, err
	}

	keywords := extractKeywords(input.JDText)
	if err := app.saveKeywordsForApplication(int(id), keywords); err != nil {
		log.Printf("save application keywords: %v", err)
	}

	return app.getJobApplication(int(id))
}

func (app *application) getJobApplication(id int) (jobApplicationResponse, error) {
	const query = `SELECT
		id,
		company,
		position,
		jd_text,
		match_score,
		risk_level,
		matched_points,
		missing_points,
		resume_suggestions,
		message_draft,
		status,
		created_at,
		updated_at
	FROM job_applications
	WHERE id = ?`

	var item jobApplicationResponse
	var matchedPointsJSON string
	var missingPointsJSON string
	var resumeSuggestionsJSON string

	err := app.db.QueryRow(query, id).Scan(
		&item.ID,
		&item.Company,
		&item.Position,
		&item.JDText,
		&item.MatchScore,
		&item.RiskLevel,
		&matchedPointsJSON,
		&missingPointsJSON,
		&resumeSuggestionsJSON,
		&item.MessageDraft,
		&item.Status,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return jobApplicationResponse{}, err
	}

	if err := json.Unmarshal([]byte(matchedPointsJSON), &item.MatchedPoints); err != nil {
		return jobApplicationResponse{}, err
	}
	if err := json.Unmarshal([]byte(missingPointsJSON), &item.MissingPoints); err != nil {
		return jobApplicationResponse{}, err
	}
	if err := json.Unmarshal([]byte(resumeSuggestionsJSON), &item.ResumeSuggestions); err != nil {
		return jobApplicationResponse{}, err
	}

	keywords, err := app.listApplicationKeywords(id)
	if err != nil {
		log.Printf("list application keywords: %v", err)
		item.Keywords = []keywordMatch{}
	} else {
		item.Keywords = keywords
	}

	return item, nil
}

func (app *application) listJobApplications(limit int, offset int) (jobApplicationListResponse, error) {
	const query = `SELECT
		id,
		company,
		position,
		match_score,
		risk_level,
		status,
		created_at,
		updated_at
	FROM job_applications
	ORDER BY id DESC
	LIMIT ? OFFSET ?`

	rows, err := app.db.Query(query, limit, offset)
	if err != nil {
		return jobApplicationListResponse{}, err
	}
	defer rows.Close()

	items := make([]jobApplicationListItem, 0)
	for rows.Next() {
		var item jobApplicationListItem
		if err := rows.Scan(
			&item.ID,
			&item.Company,
			&item.Position,
			&item.MatchScore,
			&item.RiskLevel,
			&item.Status,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return jobApplicationListResponse{}, err
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return jobApplicationListResponse{}, err
	}

	return jobApplicationListResponse{
		Items: items,
		Count: len(items),
	}, nil
}

func (app *application) updateJobApplicationStatus(id int, status string) (jobApplicationResponse, error) {
	const statement = `UPDATE job_applications
	SET status = ?, updated_at = CURRENT_TIMESTAMP
	WHERE id = ?`

	if _, err := app.db.Exec(statement, status, id); err != nil {
		return jobApplicationResponse{}, err
	}

	return app.getJobApplication(id)
}

func isNotFound(err error) bool {
	return errors.Is(err, sql.ErrNoRows)
}
