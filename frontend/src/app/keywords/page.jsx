"use client";

import { useEffect, useState } from "react";

const labels = {
  home: "\u9996\u9875",
  applications: "\u6295\u9012\u8bb0\u5f55",
  title: "\u5c97\u4f4d\u5173\u952e\u8bcd\u7edf\u8ba1",
  intro:
    "\u57fa\u4e8e\u56fa\u5b9a\u8bcd\u5178\u7edf\u8ba1\u5df2\u5206\u6790 JD \u4e2d\u51fa\u73b0\u7684\u6280\u672f\u5173\u952e\u8bcd\uff0c\u7528\u4e8e\u5224\u65ad\u5b66\u4e60\u4f18\u5148\u7ea7\u548c\u6295\u9012\u65b9\u5411\u3002",
  all: "\u5168\u90e8\u5206\u7c7b",
  category: "\u5206\u7c7b",
  keyword: "\u5173\u952e\u8bcd",
  count: "\u51fa\u73b0\u6b21\u6570",
  loading: "\u52a0\u8f7d\u4e2d",
  loaded: "\u5df2\u52a0\u8f7d",
  failed: "\u52a0\u8f7d\u5931\u8d25",
  empty: "\u6682\u65e0\u5173\u952e\u8bcd\u6570\u636e\u3002\u5148\u5206\u6790\u51e0\u4e2a\u5c97\u4f4d\u3002",
};

const categories = [
  "language",
  "backend",
  "database",
  "cache",
  "middleware",
  "devops",
  "network",
  "fundamentals",
  "concurrency",
  "system",
  "ai",
];

export default function KeywordsPage() {
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState(labels.loading);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStats(category);
  }, [category]);

  async function loadStats(nextCategory) {
    setStatus(labels.loading);
    setError("");

    const params = new URLSearchParams({ limit: "100" });
    if (nextCategory) {
      params.set("category", nextCategory);
    }

    try {
      const response = await fetch(`/api/keyword-stats?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "\u8bfb\u53d6\u5173\u952e\u8bcd\u7edf\u8ba1\u5931\u8d25");
      }

      setItems(data.items || []);
      setStatus(`${labels.loaded} ${data.count || 0} \u6761`);
    } catch (err) {
      setError(err.message);
      setStatus(labels.failed);
    }
  }

  return (
    <main className="shell">
      <nav className="top-nav">
        <a href="/">{labels.home}</a>
        <a href="/applications">{labels.applications}</a>
      </nav>

      <section className="page-heading">
        <p className="eyebrow">Keywords</p>
        <h1>{labels.title}</h1>
        <p className="intro">{labels.intro}</p>
      </section>

      <div className="filter-bar">
        <label>
          {labels.category}
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">{labels.all}</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-status">
        <strong>{status}</strong>
        {error ? <span>{error}</span> : null}
      </div>

      <section className="stats-table" aria-label={labels.title}>
        {items.length === 0 ? (
          <p className="empty-text">{labels.empty}</p>
        ) : (
          <>
            <div className="stats-row stats-head">
              <span>{labels.keyword}</span>
              <span>{labels.category}</span>
              <span>{labels.count}</span>
            </div>
            {items.map((item) => (
              <div className="stats-row" key={`${item.category}-${item.keyword}`}>
                <strong>{item.keyword}</strong>
                <span>{item.category}</span>
                <span className="score">{item.count}</span>
              </div>
            ))}
          </>
        )}
      </section>
    </main>
  );
}
