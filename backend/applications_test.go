package main

import "testing"

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

	updated, err := app.updateJobApplicationStatus(created.ID, statusSubmitted)
	if err != nil {
		t.Fatalf("update status: %v", err)
	}
	if updated.Status != statusSubmitted {
		t.Fatalf("status = %q, want %q", updated.Status, statusSubmitted)
	}
}
