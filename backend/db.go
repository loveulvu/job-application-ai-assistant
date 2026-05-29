package main

import (
	"database/sql"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

const defaultDBPath = "data/app.db"

func openDB() (*sql.DB, error) {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = defaultDBPath
	}

	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		return nil, err
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	if _, err := db.Exec("PRAGMA foreign_keys = ON"); err != nil {
		db.Close()
		return nil, err
	}

	if err := migrate(db); err != nil {
		db.Close()
		return nil, err
	}

	return db, nil
}

func migrate(db *sql.DB) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS resume_profiles (
			id INTEGER PRIMARY KEY CHECK (id = 1),
			name TEXT NOT NULL DEFAULT '',
			target_position TEXT NOT NULL DEFAULT '',
			skills TEXT NOT NULL DEFAULT '[]',
			projects TEXT NOT NULL DEFAULT '[]',
			summary TEXT NOT NULL DEFAULT '',
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS job_applications (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			company TEXT NOT NULL DEFAULT '',
			position TEXT NOT NULL DEFAULT '',
			jd_text TEXT NOT NULL DEFAULT '',
			match_score INTEGER NOT NULL DEFAULT 0,
			risk_level TEXT NOT NULL DEFAULT '',
			matched_points TEXT NOT NULL DEFAULT '[]',
			missing_points TEXT NOT NULL DEFAULT '[]',
			resume_suggestions TEXT NOT NULL DEFAULT '[]',
			message_draft TEXT NOT NULL DEFAULT '',
			status TEXT NOT NULL DEFAULT '',
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`INSERT OR IGNORE INTO resume_profiles (
			id,
			name,
			target_position,
			skills,
			projects,
			summary
		) VALUES (1, '', '', '[]', '[]', '')`,
	}

	for _, statement := range statements {
		if _, err := db.Exec(statement); err != nil {
			return err
		}
	}

	return nil
}
