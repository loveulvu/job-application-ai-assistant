package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestJobApplicationStatusFlow(t *testing.T) {
	t.Setenv("DB_PATH", t.TempDir()+"/app.db")

	db, err := openDB()
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()

	app := &application{db: db}

	created, err := app.createJobApplication(analyzeJobRequest{
		Company:  "Test Company",
		Position: "Go Intern",
		JDText:   "Build Go APIs.",
	}, aiAnalysisResult{
		MatchScore:        88,
		RiskLevel:         "low",
		MatchedPoints:     []string{"Go", "REST API"},
		MissingPoints:     []string{"Kafka"},
		ResumeSuggestions: []string{"Highlight Go API experience."},
		MessageDraft:      "Hello.",
	})
	if err != nil {
		t.Fatalf("create application: %v", err)
	}
	if created.Status != defaultApplicationStatus {
		t.Fatalf("status = %q, want %q", created.Status, defaultApplicationStatus)
	}

	list, err := app.listJobApplications(20, 0)
	if err != nil {
		t.Fatalf("list applications: %v", err)
	}
	if list.Count != 1 || len(list.Items) != 1 {
		t.Fatalf("list count = %d len = %d, want 1", list.Count, len(list.Items))
	}

	detail, err := app.getJobApplication(created.ID)
	if err != nil {
		t.Fatalf("get application: %v", err)
	}
	if detail.JDText != "Build Go APIs." {
		t.Fatalf("jd_text = %q", detail.JDText)
	}
	if len(detail.Keywords) == 0 {
		t.Fatalf("expected extracted keywords")
	}

	updated, err := app.updateJobApplicationStatus(created.ID, statusSubmitted)
	if err != nil {
		t.Fatalf("update status: %v", err)
	}
	if updated.Status != statusSubmitted {
		t.Fatalf("status = %q, want %q", updated.Status, statusSubmitted)
	}
}

func TestExtractKeywordsNormalizesAliases(t *testing.T) {
	keywords := extractKeywords("熟悉 Golang、go语言、Redis 缓存、RESTful API、gRPC、K8s、GitHub Actions、数据结构和算法。")
	got := make(map[string]string)
	for _, keyword := range keywords {
		got[keyword.Keyword] = keyword.Category
	}

	want := map[string]string{
		"Go":         "language",
		"Redis":      "cache",
		"REST API":   "backend",
		"gRPC":       "backend",
		"Kubernetes": "devops",
		"CI/CD":      "devops",
		"数据结构与算法":    "fundamentals",
	}

	for keyword, category := range want {
		if got[keyword] != category {
			t.Fatalf("keyword %q category = %q, want %q; got all %#v", keyword, got[keyword], category, got)
		}
	}
}

func TestKeywordPersistenceDeduplicatesPerApplicationAndStats(t *testing.T) {
	t.Setenv("DB_PATH", t.TempDir()+"/app.db")

	db, err := openDB()
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()

	app := &application{db: db}

	first, err := app.createJobApplication(analyzeJobRequest{
		Company:  "A",
		Position: "Go Intern",
		JDText:   "Go Go Golang Redis Redis MySQL",
	}, aiAnalysisResult{MatchScore: 80, RiskLevel: "low"})
	if err != nil {
		t.Fatalf("create first: %v", err)
	}

	second, err := app.createJobApplication(analyzeJobRequest{
		Company:  "B",
		Position: "Backend Intern",
		JDText:   "Redis Docker",
	}, aiAnalysisResult{MatchScore: 70, RiskLevel: "medium"})
	if err != nil {
		t.Fatalf("create second: %v", err)
	}

	firstKeywords, err := app.listApplicationKeywords(first.ID)
	if err != nil {
		t.Fatalf("list first keywords: %v", err)
	}
	assertKeywordCount(t, firstKeywords, "Go", 1)
	assertKeywordCount(t, firstKeywords, "Redis", 1)

	secondKeywords, err := app.listApplicationKeywords(second.ID)
	if err != nil {
		t.Fatalf("list second keywords: %v", err)
	}
	assertKeywordCount(t, secondKeywords, "Redis", 1)

	stats, err := app.listKeywordStats(10, "")
	if err != nil {
		t.Fatalf("list stats: %v", err)
	}
	if len(stats) == 0 || stats[0].Keyword != "Redis" || stats[0].Count != 2 {
		t.Fatalf("first stat = %#v, want Redis count 2; all stats %#v", firstStat(stats), stats)
	}

	cacheStats, err := app.listKeywordStats(10, "cache")
	if err != nil {
		t.Fatalf("list cache stats: %v", err)
	}
	if len(cacheStats) != 1 || cacheStats[0].Keyword != "Redis" || cacheStats[0].Count != 2 {
		t.Fatalf("cache stats = %#v, want Redis count 2", cacheStats)
	}
}

func TestKeywordStatsHandler(t *testing.T) {
	t.Setenv("DB_PATH", t.TempDir()+"/app.db")

	db, err := openDB()
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()

	app := &application{db: db}
	if _, err := app.createJobApplication(analyzeJobRequest{
		Company:  "A",
		Position: "Go Intern",
		JDText:   "Redis MySQL",
	}, aiAnalysisResult{MatchScore: 80, RiskLevel: "low"}); err != nil {
		t.Fatalf("create application: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/keyword-stats?category=cache", nil)
	recorder := httptest.NewRecorder()

	app.handleKeywordStats(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}

	var response keywordStatsResponse
	if err := json.NewDecoder(recorder.Body).Decode(&response); err != nil {
		t.Fatalf("decode response: %v", err)
	}

	if response.Count != 1 || response.Items[0].Keyword != "Redis" {
		t.Fatalf("response = %#v, want Redis cache stat", response)
	}
}

func assertKeywordCount(t *testing.T, keywords []keywordMatch, keyword string, want int) {
	t.Helper()

	count := 0
	for _, item := range keywords {
		if item.Keyword == keyword {
			count++
		}
	}
	if count != want {
		t.Fatalf("keyword %q count = %d, want %d; keywords %#v", keyword, count, want, keywords)
	}
}

func firstStat(stats []keywordStat) keywordStat {
	if len(stats) == 0 {
		return keywordStat{}
	}
	return stats[0]
}
