"use client";

import { useEffect, useState } from "react";

const statusOptions = ["待投递", "已投递", "已沟通", "面试", "拒绝"];
const riskLabels = {
  low: "低",
  medium: "中",
  high: "高",
};

export default function ApplicationsPage() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("加载中");
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    setStatus("加载中");
    setError("");

    try {
      const response = await fetch("/api/applications?limit=50", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "读取投递记录失败");
      }

      setItems(data.items || []);
      setStatus(`已加载 ${data.count || 0} 条`);
      if ((data.items || []).length > 0) {
        loadApplicationDetail(data.items[0].id);
      }
    } catch (err) {
      setError(err.message);
      setStatus("加载失败");
    }
  }

  async function loadApplicationDetail(id) {
    setError("");

    try {
      const response = await fetch(`/api/applications/${id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "读取详情失败");
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
        throw new Error(data.error || "修改状态失败");
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
        <a href="/">首页</a>
        <a href="/profile">Profile</a>
      </nav>

      <section className="page-heading">
        <p className="eyebrow">Applications</p>
        <h1>投递分析记录</h1>
        <p className="intro">查看 AI 分析结果，跟踪投递状态。</p>
      </section>

      <div className="form-status">
        <strong>{status}</strong>
        {error ? <span>{error}</span> : null}
      </div>

      <section className="applications-layout">
        <div className="records-list" aria-label="投递记录列表">
          {items.length === 0 ? (
            <p className="empty-text">暂无记录。先在 BOSS 页面用脚本分析一个岗位。</p>
          ) : (
            items.map((item) => (
              <button
                className={selected && selected.id === item.id ? "record-row active" : "record-row"}
                key={item.id}
                type="button"
                onClick={() => loadApplicationDetail(item.id)}
              >
                <span>
                  <strong>{item.company || "未知公司"}</strong>
                  <small>{item.position || "未知岗位"}</small>
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
        <p className="empty-text">选择一条记录查看详情。</p>
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
        状态
        <select value={selected.status || "待投递"} onChange={(event) => onStatusChange(event.target.value)} disabled={updating}>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <dl className="detail-meta">
        <dt>风险等级</dt>
        <dd>{riskLabels[selected.risk_level] || selected.risk_level || "-"}</dd>
        <dt>创建时间</dt>
        <dd>{formatTime(selected.created_at)}</dd>
        <dt>更新时间</dt>
        <dd>{formatTime(selected.updated_at)}</dd>
      </dl>

      <DetailList title="匹配点" values={selected.matched_points} />
      <DetailList title="缺失点" values={selected.missing_points} />
      <DetailList title="简历优化建议" values={selected.resume_suggestions} />

      <section className="message-box">
        <h3>沟通语</h3>
        <p>{selected.message_draft || "-"}</p>
      </section>

      <details className="jd-box">
        <summary>JD 文本</summary>
        <p>{selected.jd_text || "-"}</p>
      </details>
    </aside>
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
