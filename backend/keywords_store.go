package main

func (app *application) saveKeywordsForApplication(applicationID int, keywords []keywordMatch) error {
	const statement = `INSERT OR IGNORE INTO job_keywords (
		application_id,
		keyword,
		category
	) VALUES (?, ?, ?)`

	for _, keyword := range keywords {
		if _, err := app.db.Exec(statement, applicationID, keyword.Keyword, keyword.Category); err != nil {
			return err
		}
	}

	return nil
}

func (app *application) listApplicationKeywords(applicationID int) ([]keywordMatch, error) {
	const query = `SELECT keyword, category
	FROM job_keywords
	WHERE application_id = ?
	ORDER BY category ASC, keyword ASC`

	rows, err := app.db.Query(query, applicationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]keywordMatch, 0)
	for rows.Next() {
		var item keywordMatch
		if err := rows.Scan(&item.Keyword, &item.Category); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return items, nil
}

func (app *application) listKeywordStats(limit int, category string) ([]keywordStat, error) {
	query := `SELECT keyword, category, COUNT(*) AS count
	FROM job_keywords`
	args := make([]any, 0, 3)

	if category != "" {
		query += ` WHERE category = ?`
		args = append(args, category)
	}

	query += ` GROUP BY keyword, category
	ORDER BY count DESC, keyword ASC
	LIMIT ?`
	args = append(args, limit)

	rows, err := app.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]keywordStat, 0)
	for rows.Next() {
		var item keywordStat
		if err := rows.Scan(&item.Keyword, &item.Category, &item.Count); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return items, nil
}
