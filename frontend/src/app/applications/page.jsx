"use client";

import { useEffect, useState } from "react";

const labels = {
  home: "\u9996\u9875",
  keywords: "\u5173\u952e\u8bcd\u7edf\u8ba1",
  title: "\u6295\u9012\u5206\u6790\u8bb0\u5f55",
  intro: "\u67e5\u770b \u0041\u0049 \u5206\u6790\u7ed3\u679c\uff0c\u8ddf\u8e2a\u6295\u9012\u72b6\u6001\u3002",
  loading: "\u52a0\u8f7d\u4e2d",
  loaded: "\u5df2\u52a0\u8f7d",
  failed: "\u52a0\u8f7d\u5931\u8d25",
  noRecords: "\u6682\u65e0\u8bb0\u5f55\u3002\u5148\u5728 BOSS \u9875\u9762\u7528\u811a\u672c\u5206\u6790\u4e00\u4e2a\u5c97\u4f4d\u3002",
  unknownCompany: "\u672a\u77e5\u516c\u53f8",
  unknownPosition: "\u672a\u77e5\u5c97\u4f4d",
  chooseRecord: "\u9009\u62e9\u4e00\u6761\u8bb0\u5f55\u67e5\u770b\u8be6\u60c5\u3002",
  status: "\u72b6\u6001",
  risk: "\u98ce\u9669\u7b49\u7ea7",
  createdAt: "\u521b\u5efa\u65f6\u95f4",
  updatedAt: "\u66f4\u65b0\u65f6\u95f4",
  matched: "\u5339\u914d\u70b9",
  missing: "\u7f3a\u5931\u70b9",
  suggestions: "\u7b80\u5386\u4f18\u5316\u5efa\u8bae",
  message: "\u6c9f\u901a\u8bed",
  jdText: "\u004a\u0044 \u6587\u672c",
  techKeywords: "\u6280\u672f\u5173\u952e\u8bcd",
};

const statusOptions = [
  "\u5f85\u6295\u9012",
  "\u5df2\u6295\u9012",
  "\u5df2\u6c9f\u901a",
  "\u9762\u8bd5",
  "\u62d2\u7edd",
];
const riskLabels = {
  low: "\u4f4e",
  medium: "\u4e2d",
  high: "\u9ad8",
};

export default function ApplicationsPage() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState(labels.loading);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    setStatus(labels.loading);
    setError("");

    try {
      const response = await fetch("/api/applications?limit=50", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "\u8bfb\u53d6\u6295\u9012\u8bb0\u5f55\u5931\u8d25");
      }

      setItems(data.items || []);
      setStatus(`${labels.loaded} ${data.count || 0} \u6761`);
      if ((data.items || []).length > 0) {
        loadApplicationDetail(data.items[0].id);
      }
    } catch (err) {
      setError(err.message);
      setStatus(labels.failed);
    }
  }

  async function loadApplicationDetail(id) {
    setError("");

    try {
      const response = await fetch(`/api/applications/${id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "\u8bfb\u53d6\u8be6\u60c5\u5931\u8d25");
      }
      setSelected(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(nextStatus) {
    if (!selected) {
      return;
    }

    setUpdating(true);
    setError("");

    try {
      const response = await fetch(`/api/applications/${selected.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "\u4fee\u6539\u72b6\u6001\u5931\u8d25");
      }

      setSelected(data);
      setItems((current) =>
        current.map((item) =>
          item.id === data.id
            ? {
                ...item,
                status: data.status,
                updated_at: data.updated_at,
              }
            : item,
        ),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <main className="shell wide">
      <nav className="top-nav">
        <a href="/">{labels.home}</a>
        <a href="/profile">Profile</a>
        <a href="/keywords">{labels.keywords}</a>
      </nav>

      <section className="page-heading">
        <p className="eyebrow">Applications</p>
        <h1>{labels.title}</h1>
        <p className="intro">{labels.intro}</p>
      </section>

      <div className="form-status">
        <strong>{status}</strong>
        {error ? <span>{error}</span> : null}
      </div>

      <section className="applications-layout">
        <div className="records-list" aria-label={labels.title}>
          {items.length === 0 ? (
            <p className="empty-text">{labels.noRecords}</p>
          ) : (
            items.map((item) => (
              <button
                className={selected && selected.id === item.id ? "record-row active" : "record-row"}
                key={item.id}
                type="button"
                onClick={() => loadApplicationDetail(item.id)}
              >
                <span>
                  <strong>{item.company || labels.unknownCompany}</strong>
                  <small>{item.position || labels.unknownPosition}</small>
                </span>
                <span className="score">{item.match_score}</span>
                <span>{riskLabels[item.risk_level] || item.risk_level || "-"}</span>
                <span>{item.status || "-"}</span>
                <time>{formatTime(item.created_at)}</time>
              </button>
            ))
          )}
        </div>

        <ApplicationDetail selected={selected} updating={updating} onStatusChange={updateStatus} />
      </section>
    </main>
  );
}

function ApplicationDetail({ selected, updating, onStatusChange }) {
  if (!selected) {
    return (
      <aside className="detail-panel">
        <p className="empty-text">{labels.chooseRecord}</p>
      </aside>
    );
  }

  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <div>
          <h2>{selected.position}</h2>
          <p>{selected.company}</p>
        </div>
        <div className="score-large">{selected.match_score}</div>
      </div>

      <label className="status-picker">
        {labels.status}
        <select value={selected.status || statusOptions[0]} onChange={(event) => onStatusChange(event.target.value)} disabled={updating}>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <dl className="detail-meta">
        <dt>{labels.risk}</dt>
        <dd>{riskLabels[selected.risk_level] || selected.risk_level || "-"}</dd>
        <dt>{labels.createdAt}</dt>
        <dd>{formatTime(selected.created_at)}</dd>
        <dt>{labels.updatedAt}</dt>
        <dd>{formatTime(selected.updated_at)}</dd>
      </dl>

      <KeywordTags keywords={selected.keywords} />
      <DetailList title={labels.matched} values={selected.matched_points} />
      <DetailList title={labels.missing} values={selected.missing_points} />
      <DetailList title={labels.suggestions} values={selected.resume_suggestions} />

      <section className="message-box">
        <h3>{labels.message}</h3>
        <p>{selected.message_draft || "-"}</p>
      </section>

      <details className="jd-box">
        <summary>{labels.jdText}</summary>
        <p>{selected.jd_text || "-"}</p>
      </details>
    </aside>
  );
}

function KeywordTags({ keywords }) {
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return null;
  }

  return (
    <section className="keyword-section">
      <h3>{labels.techKeywords}</h3>
      <div className="keyword-tags">
        {keywords.map((item) => (
          <span key={`${item.category}-${item.keyword}`}>
            {item.keyword}
            <small>{item.category}</small>
          </span>
        ))}
      </div>
    </section>
  );
}

function DetailList({ title, values }) {
  return (
    <section className="detail-list">
      <h3>{title}</h3>
      {Array.isArray(values) && values.length > 0 ? (
        <ul>
          {values.map((value, index) => (
            <li key={`${title}-${index}`}>{value}</li>
          ))}
        </ul>
      ) : (
        <p>-</p>
      )}
    </section>
  );
}

function formatTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN");
}
