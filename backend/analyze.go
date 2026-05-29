package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type analyzeJobRequest struct {
	Company  string `json:"company"`
	Position string `json:"position"`
	JDText   string `json:"jd_text"`
}

type aiAnalysisResult struct {
	MatchScore        int      `json:"match_score"`
	RiskLevel         string   `json:"risk_level"`
	MatchedPoints     []string `json:"matched_points"`
	MissingPoints     []string `json:"missing_points"`
	ResumeSuggestions []string `json:"resume_suggestions"`
	MessageDraft      string   `json:"message_draft"`
}

func (app *application) handleAnalyzeJob(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 2<<20)

	var input analyzeJobRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	input.normalize()
	if err := input.validate(); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	profile, err := app.getResumeProfile()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read resume profile")
		return
	}
	if profile.isEmpty() {
		writeError(w, http.StatusBadRequest, "resume profile is empty; please update /api/resume-profile first")
		return
	}

	client, err := newAIClientFromEnv()
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 70*time.Second)
	defer cancel()

	content, err := client.completeJSON(ctx, buildAnalyzePrompt(profile, input))
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}

	analysis, err := parseAIAnalysisResult(content)
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}

	result, err := app.createJobApplication(input, analysis)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save job application")
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (input *analyzeJobRequest) normalize() {
	input.Company = strings.TrimSpace(input.Company)
	input.Position = strings.TrimSpace(input.Position)
	input.JDText = strings.TrimSpace(input.JDText)
}

func (input analyzeJobRequest) validate() error {
	if input.Company == "" {
		return errors.New("company is required")
	}
	if input.Position == "" {
		return errors.New("position is required")
	}
	if input.JDText == "" {
		return errors.New("jd_text is required")
	}
	return nil
}

func (profile resumeProfile) isEmpty() bool {
	return strings.TrimSpace(profile.Name) == "" &&
		strings.TrimSpace(profile.TargetPosition) == "" &&
		len(profile.Skills) == 0 &&
		len(profile.Projects) == 0 &&
		strings.TrimSpace(profile.Summary) == ""
}

func buildAnalyzePrompt(profile resumeProfile, input analyzeJobRequest) string {
	skillsJSON, _ := json.Marshal(profile.Skills)
	projectsJSON, _ := json.Marshal(profile.Projects)

	return fmt.Sprintf(`Analyze the match between the candidate resume profile and the job description.

Rules:
- Return only valid JSON.
- Do not return Markdown.
- Do not return explanatory text outside JSON.
- match_score must be an integer from 0 to 100.
- risk_level must be one of: low, medium, high.
- matched_points, missing_points, and resume_suggestions must be JSON arrays of strings.
- message_draft should be a concise Chinese outreach message for applying to this role.
- message_draft must use the candidate name from the resume profile exactly when name is not empty.
- Do not invent placeholder candidate names such as "王某某".
- If the candidate name is empty, do not mention a candidate name; start with "您好，我想投递..." or an equivalent polite sentence.

Candidate resume profile:
- name: %s
- target_position: %s
- skills: %s
- projects: %s
- summary: %s

Job:
- company: %s
- position: %s
- jd_text: %s

Return exactly this JSON shape:
{
  "match_score": 0,
  "risk_level": "low | medium | high",
  "matched_points": [],
  "missing_points": [],
  "resume_suggestions": [],
  "message_draft": ""
}`, profile.Name, profile.TargetPosition, string(skillsJSON), string(projectsJSON), profile.Summary, input.Company, input.Position, input.JDText)
}

func parseAIAnalysisResult(content string) (aiAnalysisResult, error) {
	var result aiAnalysisResult
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return aiAnalysisResult{}, fmt.Errorf("LLM returned invalid JSON: %w", err)
	}

	result.RiskLevel = strings.TrimSpace(result.RiskLevel)
	result.MessageDraft = strings.TrimSpace(result.MessageDraft)
	result.MatchedPoints = compactTextList(result.MatchedPoints)
	result.MissingPoints = compactTextList(result.MissingPoints)
	result.ResumeSuggestions = compactTextList(result.ResumeSuggestions)

	if result.MatchScore < 0 || result.MatchScore > 100 {
		return aiAnalysisResult{}, fmt.Errorf("LLM returned invalid JSON: match_score must be between 0 and 100")
	}
	if result.RiskLevel != "low" && result.RiskLevel != "medium" && result.RiskLevel != "high" {
		return aiAnalysisResult{}, fmt.Errorf("LLM returned invalid JSON: risk_level must be low, medium, or high")
	}

	return result, nil
}
