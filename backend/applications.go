package main

import "encoding/json"

const defaultApplicationStatus = "\u5f85\u6295\u9012"

type jobApplicationResponse struct {
	ID                int      `json:"id"`
	Company           string   `json:"company"`
	Position          string   `json:"position"`
	MatchScore        int      `json:"match_score"`
	RiskLevel         string   `json:"risk_level"`
	MatchedPoints     []string `json:"matched_points"`
	MissingPoints     []string `json:"missing_points"`
	ResumeSuggestions []string `json:"resume_suggestions"`
	MessageDraft      string   `json:"message_draft"`
	Status            string   `json:"status"`
	CreatedAt         string   `json:"created_at"`
	UpdatedAt         string   `json:"updated_at"`
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

	return app.getJobApplication(int(id))
}

func (app *application) getJobApplication(id int) (jobApplicationResponse, error) {
	const query = `SELECT
		id,
		company,
		position,
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

	return item, nil
}
